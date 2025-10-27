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
      const child = spawn('node', ['dist/cli.js', command, ...args], {
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
    console.log('🚀 RecCall Performance Benchmark');
    console.log('================================\n');

    // Test data
    const testShortcut = 'benchmark-test';
    const testContext = 'This is a test context for benchmarking RecCall performance.';

    // Benchmark 1: Record command
    console.log('📝 Testing rec command...');
    const recResult = await this.runCommand('rec', [testShortcut, testContext]);
    this.results.push(recResult);

    // Benchmark 2: Call command (should be fast with caching)
    console.log('📞 Testing call command...');
    const callResult = await this.runCommand('call', [testShortcut]);
    this.results.push(callResult);

    // Benchmark 3: List command
    console.log('📋 Testing list command...');
    const listResult = await this.runCommand('list');
    this.results.push(listResult);

    // Benchmark 4: Multiple call commands (cache performance)
    console.log('🔄 Testing multiple call commands (cache performance)...');
    const callResults = await Promise.all([
      this.runCommand('call', [testShortcut]),
      this.runCommand('call', [testShortcut]),
      this.runCommand('call', [testShortcut])
    ]);
    this.results.push(...callResults);

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    const deleteResult = await this.runCommand('delete', [testShortcut]);
    this.results.push(deleteResult);

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

      console.log(`\n📈 Performance Summary:`);
      console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Minimum: ${minDuration.toFixed(2)}ms`);
      console.log(`  Maximum: ${maxDuration.toFixed(2)}ms`);

      // Performance targets
      const subMsCount = successfulResults.filter(r => r.duration < 1).length;
      const sub10MsCount = successfulResults.filter(r => r.duration < 10).length;
      
      console.log(`\n🎯 Performance Targets:`);
      console.log(`  Sub-millisecond (<1ms): ${subMsCount}/${successfulResults.length} (${(subMsCount/successfulResults.length*100).toFixed(1)}%)`);
      console.log(`  Sub-10ms (<10ms): ${sub10MsCount}/${successfulResults.length} (${(sub10MsCount/successfulResults.length*100).toFixed(1)}%)`);
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
