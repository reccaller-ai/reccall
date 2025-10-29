# RecCall Performance Guide

This guide provides best practices for optimizing RecCall performance and understanding the performance characteristics of the system.

## Overview

RecCall has been optimized for sub-millisecond operations with intelligent caching, batched I/O operations, and comprehensive performance monitoring.

## Performance Targets

### Operation Performance
- **rec command**: <1ms (cached) / <50ms (first write)
- **call command**: <1ms (cached) / <30ms (cold start)
- **list command**: <10ms (cached) / <80ms (cold start)
- **search command**: <10ms
- **update command**: <1ms (cached) / <50ms (first write)
- **delete command**: <1ms (cached) / <50ms (first write)

### System Performance
- **MCP server overhead**: <5ms
- **Repository operations**: <100ms (network) / <10ms (cached)
- **Cache hit rate**: >95% for typical workloads

## Architecture Optimizations

### 1. Multi-Layer Caching with LRU Eviction

RecCall uses a sophisticated multi-layer caching system:

- **Memory Cache (L1)**: LRU cache with configurable TTL and max size
- **Disk Cache (L2)**: Persistent cache for cold starts
- **Automatic Eviction**: Least recently used items are evicted when cache is full

```typescript
// Cache configuration
const cacheManager = new MultiLayerCacheManager({
  maxSize: 1000,           // Maximum cache entries
  ttl: 3600000,            // 1 hour default TTL
  updateAgeOnGet: true     // Refresh TTL on access
});
```

### 2. Batched File I/O Operations

File writes are automatically batched to reduce I/O overhead:

- **Write Batching**: Multiple writes within 50ms are batched
- **Atomic Writes**: All writes use atomic rename operations
- **Cache-First**: Updates happen in-memory immediately, writes are queued

```typescript
// Multiple writes are automatically batched
await storage.record('shortcut1', 'context1');
await storage.record('shortcut2', 'context2');
await storage.record('shortcut3', 'context3');
// Only one disk write occurs
```

### 3. Performance Monitoring

Comprehensive performance monitoring is built-in:

```typescript
import { telemetryManager } from 'reccall/core';

// Get performance metrics
const metrics = telemetryManager.getMetrics();
console.log({
  averageResponseTime: metrics.averageResponseTime,
  operationCounts: metrics.operationCounts,
  cacheHitRate: metrics.cacheHitRate,
  fileIOOperations: metrics.fileIOOperations
});
```

## Performance Best Practices

### 1. Cache Warmup

Warm up the cache on application startup:

```typescript
const engine = await createCoreEngine();
await engine.initialize();

// Pre-load commonly used shortcuts
const shortcuts = await engine.list();
// Cache is now warm and subsequent operations will be fast
```

### 2. Batch Operations

When recording multiple shortcuts, batch them:

```typescript
// Good: Sequential batch writes
await engine.record('shortcut1', 'context1');
await engine.record('shortcut2', 'context2');
await engine.record('shortcut3', 'context3');
// Writes are automatically batched

// Better: Parallel operations with batched writes
await Promise.all([
  engine.record('shortcut1', 'context1'),
  engine.record('shortcut2', 'context2'),
  engine.record('shortcut3', 'context3')
]);
```

### 3. Cache Size Configuration

Adjust cache size based on your workload:

```typescript
// For applications with many shortcuts
const cacheManager = new MultiLayerCacheManager(5000); // 5000 entries

// For memory-constrained environments
const cacheManager = new MultiLayerCacheManager(100); // 100 entries
```

### 4. TTL Configuration

Configure TTL based on data freshness requirements:

```typescript
// Short TTL for frequently changing data
configManager.setCacheTtl(60000); // 1 minute

// Long TTL for stable data
configManager.setCacheTtl(3600000); // 1 hour
```

## Benchmarking

Use the built-in benchmarking suite to measure performance:

```bash
# Run comprehensive benchmarks
npm run benchmark

# Or use the script directly
node scripts/benchmark.ts
```

### Benchmark Metrics

The benchmark suite measures:
- **Average response time**: Mean of all operations
- **Percentiles**: P50, P95, P99 response times
- **Cache performance**: Hit rates and miss rates
- **Per-operation metrics**: Individual command performance
- **Throughput**: Operations per second

### Example Benchmark Output

```
📊 Benchmark Results
===================

✅ Successful Operations:
  🚀 call cached: 0.45ms
  🚀 call cached: 0.52ms
  ⚡ list: 8.32ms
  
📈 Performance Summary:
  Average: 2.15ms
  Minimum: 0.45ms
  Maximum: 8.32ms
  P50 (median): 0.52ms
  P95: 8.32ms
  P99: 8.32ms

🎯 Performance Targets:
  Sub-millisecond (<1ms): 2/3 (66.7%)
  Sub-10ms (<10ms): 3/3 (100.0%)

📊 Performance by Command:
  call: avg=0.48ms, min=0.45ms, max=0.52ms (2 operations)
  list: avg=8.32ms, min=8.32ms, max=8.32ms (1 operations)
```

## Monitoring Production Performance

### 1. Telemetry Metrics

Enable telemetry to monitor production performance:

```typescript
import { telemetryManager } from 'reccall/core';

// Export Prometheus metrics
const metrics = telemetryManager.exportPrometheusMetrics();
console.log(metrics);
```

### 2. Performance Decorators

Use the `@Performance` decorator to monitor specific operations:

```typescript
import { Performance } from 'reccall/core';

class MyService {
  @Performance('my-operation')
  async myOperation() {
    // Automatically monitored
  }
}
```

### 3. Log Analysis

Analyze structured logs for performance insights:

```typescript
// Logs include performance metrics
telemetryManager.logEvent({
  event: 'operation.completed',
  duration: 1.2,
  properties: {
    operation: 'record',
    cacheHit: true
  }
});
```

## Troubleshooting Performance Issues

### High Response Times

1. **Check cache hit rate**: Low hit rates indicate cache configuration issues
2. **Monitor file I/O**: High file I/O counts suggest batching isn't working
3. **Review telemetry**: Check operation counts and error rates

### Memory Usage

1. **Reduce cache size**: Lower `maxSize` parameter
2. **Shorter TTL**: More frequent evictions
3. **Monitor cache stats**: Use `getStats()` to see cache utilization

### Disk I/O Bottlenecks

1. **Enable write batching**: Already enabled by default
2. **Use faster storage**: SSD instead of HDD
3. **Consider Redis/PostgreSQL**: For high-throughput scenarios

## Advanced Optimizations

### 1. Custom Storage Backend

For high-performance scenarios, use Redis or PostgreSQL:

```typescript
import { RedisStorage } from 'reccall/storage-backends/redis';

const storage = new RedisStorage({
  url: 'redis://localhost:6379',
  keyPrefix: 'reccall:',
  ttl: 3600
});
```

### 2. Connection Pooling

For repository operations, implement connection pooling:

```typescript
// Repository client can be configured with connection pooling
const repository = new HttpRepositoryClient({
  poolSize: 10,
  timeout: 5000
});
```

### 3. Predictive Caching

Pre-fetch likely-to-be-used shortcuts:

```typescript
// Predict and pre-fetch based on usage patterns
const likelyShortcuts = await analyzeUsagePatterns();
await Promise.all(
  likelyShortcuts.map(id => engine.call(id))
);
```

## Performance Monitoring Dashboard

Set up monitoring using Prometheus and Grafana:

```typescript
// Export metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(telemetryManager.exportPrometheusMetrics());
});
```

## Summary

RecCall is optimized for performance with:
- ✅ Sub-millisecond cached operations
- ✅ Intelligent multi-layer caching
- ✅ Batched I/O operations
- ✅ Comprehensive performance monitoring
- ✅ Automatic cache eviction
- ✅ Detailed benchmarking suite

Follow this guide to maximize RecCall's performance in your environment.

