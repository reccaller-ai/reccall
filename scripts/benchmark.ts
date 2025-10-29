#!/usr/bin/env node

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  command: string;
  duration: number;
  success: boolean;
  error?: string;
}

class RecCallBenchmark {
  private results: BenchmarkResult[] = [];

  async runCommand(command: string, args: string[] = []): Promise<BenchmarkResult> {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const child = spawn('node', ['dist/src/cli.js', command, ...args], {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = performance.now() - startTime;
        resolve({
          command: `${command} ${args.join(' ')}`.trim(),
          duration,
          success: code === 0,
          error: code !== 0 ? stderr : undefined
        });
      });

      child.on('error', (error) => {
        const duration = performance.now() - startTime;
        resolve({
          command: `${command} ${args.join(' ')}`.trim(),
          duration,
          success: false,
          error: error.message
        });
      });
    });
  }

  async runBenchmarks(): Promise<void> {
    console.log('🚀 RecCall Performance Benchmark Suite');
    console.log('======================================\n');

    // Test data
    const testShortcut = 'benchmark-test';
    const testContext = 'This is a test context for benchmarking RecCall performance.';

    // Benchmark 1: Record command (cold start)
    console.log('📝 Testing rec command (cold start)...');
    const recResultCold = await this.runCommand('rec', [testShortcut, testContext]);
    this.results.push(recResultCold);

    // Benchmark 2: Call command (first call - cache warm)
    console.log('📞 Testing call command (first call)...');
    const callResult1 = await this.runCommand('call', [testShortcut]);
    this.results.push(callResult1);

    // Benchmark 3: Call command (cached - should be fast)
    console.log('⚡ Testing call command (cached)...');
    const callResult2 = await this.runCommand('call', [testShortcut]);
    this.results.push(callResult2);

    // Benchmark 4: List command
    console.log('📋 Testing list command...');
    const listResult = await this.runCommand('list');
    this.results.push(listResult);

    // Benchmark 5: Multiple concurrent call commands (cache performance)
    console.log('🔄 Testing multiple concurrent call commands (cache performance)...');
    const concurrentResults = await Promise.all([
      this.runCommand('call', [testShortcut]),
      this.runCommand('call', [testShortcut]),
      this.runCommand('call', [testShortcut]),
      this.runCommand('call', [testShortcut]),
      this.runCommand('call', [testShortcut])
    ]);
    this.results.push(...concurrentResults);

    // Benchmark 6: Search command
    console.log('🔍 Testing search command...');
    const searchResult = await this.runCommand('search', ['benchmark']);
    this.results.push(searchResult);

    // Benchmark 7: Update command
    console.log('✏️  Testing update command...');
    const updateResult = await this.runCommand('update', [testShortcut, testContext + ' (updated)']);
    this.results.push(updateResult);

    // Benchmark 8: Batch operations
    console.log('📦 Testing batch operations (multiple records)...');
    const batchResults = await Promise.all([
      this.runCommand('rec', ['benchmark-test-1', 'Test context 1']),
      this.runCommand('rec', ['benchmark-test-2', 'Test context 2']),
      this.runCommand('rec', ['benchmark-test-3', 'Test context 3'])
    ]);
    this.results.push(...batchResults);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    const cleanupCommands = [
      this.runCommand('delete', [testShortcut]),
      this.runCommand('delete', ['benchmark-test-1']),
      this.runCommand('delete', ['benchmark-test-2']),
      this.runCommand('delete', ['benchmark-test-3'])
    ];
    const cleanupResults = await Promise.all(cleanupCommands);
    this.results.push(...cleanupResults);

    this.printResults();
  }

  printResults(): void {
    console.log('\n📊 Benchmark Results');
    console.log('===================\n');

    const successfulResults = this.results.filter(r => r.success);
    const failedResults = this.results.filter(r => !r.success);

    if (successfulResults.length > 0) {
      console.log('✅ Successful Operations:');
      successfulResults.forEach(result => {
        const status = result.duration < 1 ? '🚀' : result.duration < 10 ? '⚡' : '🐌';
        console.log(`  ${status} ${result.command}: ${result.duration.toFixed(2)}ms`);
      });

      const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const minDuration = Math.min(...successfulResults.map(r => r.duration));
      const maxDuration = Math.max(...successfulResults.map(r => r.duration));

      // Calculate percentile
      const sortedDurations = successfulResults.map(r => r.duration).sort((a, b) => a - b);
      const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
      const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
      const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];

      console.log(`\n📈 Performance Summary:`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Minimum: ${minDuration.toFixed(2)}ms`);
      console.log(`  Maximum: ${maxDuration.toFixed(2)}ms`);
      console.log(`  P50 (median): ${p50.toFixed(2)}ms`);
      console.log(`  P95: ${p95.toFixed(2)}ms`);
      console.log(`  P99: ${p99.toFixed(2)}ms`);

      // Performance targets
      const subMsCount = successfulResults.filter(r => r.duration < 1).length;
      const sub10MsCount = successfulResults.filter(r => r.duration < 10).length;
      const sub100MsCount = successfulResults.filter(r => r.duration < 100).length;
      
      console.log(`\n🎯 Performance Targets:`);
      console.log(`  Sub-millisecond (<1ms): ${subMsCount}/${successfulResults.length} (${(subMsCount/successfulResults.length*100).toFixed(1)}%)`);
      console.log(`  Sub-10ms (<10ms): ${sub10MsCount}/${successfulResults.length} (${(sub10MsCount/successfulResults.length*100).toFixed(1)}%)`);
      console.log(`  Sub-100ms (<100ms): ${sub100MsCount}/${successfulResults.length} (${(sub100MsCount/successfulResults.length*100).toFixed(1)}%)`);

      // Performance by operation type
      const resultsByCommand = successfulResults.reduce((acc, r) => {
        const cmd = r.command.split(' ')[0];
        if (!acc[cmd]) {
          acc[cmd] = { count: 0, total: 0, min: Infinity, max: 0 };
        }
        acc[cmd].count++;
        acc[cmd].total += r.duration;
        acc[cmd].min = Math.min(acc[cmd].min, r.duration);
        acc[cmd].max = Math.max(acc[cmd].max, r.duration);
        return acc;
      }, {} as Record<string, { count: number; total: number; min: number; max: number }>);

      console.log(`\n📊 Performance by Command:`);
      for (const [cmd, stats] of Object.entries(resultsByCommand)) {
        const avg = stats.total / stats.count;
        console.log(`  ${cmd}: avg=${avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms (${stats.count} operations)`);
      }
    }

    if (failedResults.length > 0) {
      console.log('\n❌ Failed Operations:');
      failedResults.forEach(result => {
        console.log(`  ${result.command}: ${result.error}`);
      });
    }

    console.log('\n🎯 Performance Goals:');
    console.log('  • rec command: <1ms (cached)');
    console.log('  • call command: <1ms (cached)');
    console.log('  • list command: <10ms');
    console.log('  • Repository operations: <100ms (network)');
  }
}

// Run benchmarks
async function main() {
  const benchmark = new RecCallBenchmark();
  await benchmark.runBenchmarks();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
