/**
 * Cache manager implementation with multi-layer caching and LRU eviction
 */

import "reflect-metadata";
import path from "path";
import fs from "fs/promises";
import { LRUCache } from "lru-cache";
import { injectable } from "tsyringe";
import { configManager } from "./config.js";
import type { CacheEntry, ICacheManager } from "./interfaces.js";

@injectable()
export class MultiLayerCacheManager implements ICacheManager {
	private memoryCache: LRUCache<string, CacheEntry>;
	private hitCount = 0;
	private missCount = 0;
	private maxSize: number;

	constructor(maxSize = 1000) {
		this.maxSize = maxSize;
		// Don't set global TTL - we handle TTL per-entry via isValid() check
		// This allows different entries to have different TTLs
		this.memoryCache = new LRUCache<string, CacheEntry>({
			max: maxSize,
			// ttl: undefined - let our isValid() handle TTL checks
			updateAgeOnGet: true,
			updateAgeOnHas: false,
		});
	}

	async get<T>(key: string): Promise<T | null> {
		// Try memory cache first (LRU handles TTL automatically)
		const memoryEntry = this.memoryCache.get(key);
		if (memoryEntry) {
			// Verify entry is still valid (double-check TTL)
			if (this.isValid(memoryEntry)) {
				this.hitCount++;
				return memoryEntry.data as T;
			} else {
				// Entry expired, remove it
				this.memoryCache.delete(key);
			}
		}

		// Try disk cache
		try {
			const diskEntry = await this.getFromDisk(key);
			if (diskEntry && this.isValid(diskEntry)) {
				// Update memory cache (LRU will evict if needed)
				this.memoryCache.set(key, diskEntry);
				this.hitCount++;
				return diskEntry.data as T;
			}
		} catch (error) {
			// Disk cache error, continue
		}

		this.missCount++;
		return null;
	}

	async set<T>(key: string, data: T, ttl?: number): Promise<void> {
		const entry: CacheEntry = {
			data,
			timestamp: Date.now(),
			ttl: ttl || configManager.getCacheTtl(),
		};

		// Set in memory cache
		this.memoryCache.set(key, entry);

		// Set in disk cache
		try {
			await this.setToDisk(key, entry);
		} catch (error) {
			// Disk cache error, but memory cache is still valid
			console.warn("Failed to write to disk cache:", error);
		}
	}

	async delete(key: string): Promise<void> {
		// Remove from memory cache (LRU handles automatically)
		this.memoryCache.delete(key);

		// Remove from disk cache
		try {
			await this.deleteFromDisk(key);
		} catch (error) {
			// Disk cache error, but memory cache is cleared
			// Use telemetry instead of console.warn for better monitoring
		}
	}

	async clear(): Promise<void> {
		// Clear memory cache (LRU handles automatically)
		this.memoryCache.clear();
		this.hitCount = 0;
		this.missCount = 0;

		// Clear disk cache
		try {
			const cacheDir = configManager.getCacheDirectory();
			const files = await fs.readdir(cacheDir);

			for (const file of files) {
				if (file.endsWith(".json")) {
					await fs.unlink(path.join(cacheDir, file));
				}
			}
		} catch (error) {
			// Disk cache error, but memory cache is cleared
		}
	}

	async has(key: string): Promise<boolean> {
		const entry = await this.get(key);
		return entry !== null;
	}

	async getStats(): Promise<{
		size: number;
		hitRate: number;
		missRate: number;
		maxSize: number;
		evictions?: number;
	}> {
		const total = this.hitCount + this.missCount;
		const hitRate = total > 0 ? this.hitCount / total : 0;
		const missRate = total > 0 ? this.missCount / total : 0;

		return {
			size: this.memoryCache.size,
			maxSize: this.maxSize,
			hitRate,
			missRate,
			// LRU cache provides size tracking automatically
		};
	}

	/**
	 * Check if cache entry is still valid
	 */
	private isValid(entry: CacheEntry): boolean {
		return Date.now() - entry.timestamp < entry.ttl;
	}

	/**
	 * Get entry from disk cache
	 */
	private async getFromDisk(key: string): Promise<CacheEntry | null> {
		try {
			const cacheDir = configManager.getCacheDirectory();
			const cacheFile = path.join(cacheDir, `${this.encodeKey(key)}.json`);
			const data = await fs.readFile(cacheFile, "utf-8");
			return JSON.parse(data) as CacheEntry;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Set entry to disk cache
	 */
	private async setToDisk(key: string, entry: CacheEntry): Promise<void> {
		const cacheDir = configManager.getCacheDirectory();
		const cacheFile = path.join(cacheDir, `${this.encodeKey(key)}.json`);
		await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2));
	}

	/**
	 * Delete entry from disk cache
	 */
	private async deleteFromDisk(key: string): Promise<void> {
		try {
			const cacheDir = configManager.getCacheDirectory();
			const cacheFile = path.join(cacheDir, `${this.encodeKey(key)}.json`);
			await fs.unlink(cacheFile);
		} catch (error) {
			// File might not exist, ignore error
		}
	}

	/**
	 * Encode key for filesystem use
	 */
	private encodeKey(key: string): string {
		return Buffer.from(key).toString("base64").replace(/[/+=]/g, "_");
	}
}
