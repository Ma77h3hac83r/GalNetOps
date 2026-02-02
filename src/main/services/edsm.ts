/** EDSM API client: get system, bodies, value, body count, search; in-memory and optional DB cache with TTL and rate limiting. */
import { EDSM_API_BASE, EDSM_RATE_LIMIT_MS } from '../../shared/constants';
import type { DatabaseService } from './database';
import { logInfo, logWarn, logError, logDebug, isDev } from '../logger';

export interface EDSMSystemInfo {
  name: string;
  id: number;
  id64: number;
  coords: {
    x: number;
    y: number;
    z: number;
  };
  coordsLocked: boolean;
  requirePermit: boolean;
  permitName?: string;
  information?: {
    allegiance?: string;
    government?: string;
    faction?: string;
    factionState?: string;
    population?: number;
    security?: string;
    economy?: string;
    secondEconomy?: string;
    reserve?: string;
  };
  primaryStar?: {
    type: string;
    name: string;
    isScoopable: boolean;
  };
  bodyCount?: number;
}

export interface EDSMBodyInfo {
  id: number;
  id64: number;
  bodyId: number;
  name: string;
  type: string;
  subType: string;
  distanceToArrival: number;
  isMainStar?: boolean;
  isScoopable?: boolean;
  age?: number;
  spectralClass?: string;
  luminosity?: string;
  absoluteMagnitude?: number;
  solarMasses?: number;
  solarRadius?: number;
  surfaceTemperature?: number;
  orbitalPeriod?: number;
  semiMajorAxis?: number;
  orbitalEccentricity?: number;
  orbitalInclination?: number;
  argOfPeriapsis?: number;
  rotationalPeriod?: number;
  rotationalPeriodTidallyLocked?: boolean;
  axialTilt?: number;
  isLandable?: boolean;
  gravity?: number;
  earthMasses?: number;
  radius?: number;
  volcanismType?: string;
  atmosphereType?: string;
  terraformingState?: string;
  parents?: Array<{ [key: string]: number }>;
  rings?: Array<{
    name: string;
    type: string;
    mass: number;
    innerRadius: number;
    outerRadius: number;
  }>;
}

export interface EDSMBodiesResponse {
  id: number;
  id64: number;
  name: string;
  url: string;
  bodyCount: number;
  bodies: EDSMBodyInfo[];
}

export interface EDSMValueResponse {
  id: number;
  id64: number;
  name: string;
  url: string;
  estimatedValue: number;
  estimatedValueMapped: number;
  valuableBodies: Array<{
    bodyId: number;
    bodyName: string;
    distance: number;
    valueMax: number;
  }>;
}

// Search result from /api-v1/systems (prefix search)
export interface EDSMSearchResult {
  name: string;
  id?: number;
  id64?: number;
  coords?: {
    x: number;
    y: number;
    z: number;
  };
  requirePermit?: boolean;
  permitName?: string;
  primaryStar?: {
    type: string;
    name: string;
    isScoopable: boolean;
  };
}

// Cache configuration
const MEMORY_CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for in-memory cache
const DB_CACHE_EXPIRY_HOURS = 24; // 24 hours for persistent cache
const MAX_MEMORY_CACHE_SIZE = 2000; // cap in-memory EDSM cache entries

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries
const RETRYABLE_STATUS_CODES = [502, 503, 504, 429]; // Gateway errors and rate limiting

export class EDSMService {
  private lastRequestTime: number = 0;
  private memoryCache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private dbService: DatabaseService | null = null;
  private lastError: string | null = null;

  /**
   * Set the database service for persistent caching
   * Call this after the database is initialized
   */
  setDatabaseService(dbService: DatabaseService): void {
    this.dbService = dbService;
    // Run cleanup on startup
    this.cleanupExpiredCache();
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < EDSM_RATE_LIMIT_MS) {
      await new Promise(resolve => 
        setTimeout(resolve, EDSM_RATE_LIMIT_MS - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make a fetch request with automatic retry for transient errors
   */
  private async fetchWithRetry(url: string): Promise<Response | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.rateLimit();
        const response = await fetch(url);
        
        if (response.ok) {
          this.lastError = null;
          return response;
        }
        
        // Check if this is a retryable error
        if (RETRYABLE_STATUS_CODES.includes(response.status)) {
          const errorMsg = `EDSM API error: ${response.status} ${response.statusText}`;
          this.lastError = errorMsg;
          logWarn('EDSM', `API error (attempt ${attempt}/${MAX_RETRIES})`);
          
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * attempt;
            logInfo('EDSM', `Retrying in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          this.lastError = `EDSM API error: ${response.status} ${response.statusText}`;
          logError('EDSM', 'API error (non-retryable)');
          return null;
        }
      } catch (error) {
        lastError = error as Error;
        this.lastError = `EDSM request failed: ${lastError.message}`;
        logWarn('EDSM', `Request failed (attempt ${attempt}/${MAX_RETRIES})`);
        
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    logError('EDSM', `Request failed after ${MAX_RETRIES} attempts`);
    return null;
  }

  /**
   * Get the last error message (if any)
   */
  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Clear the last error
   */
  clearLastError(): void {
    this.lastError = null;
  }

  /**
   * Get cached data from memory first, then database
   * Memory cache is faster but shorter-lived
   * Database cache persists between sessions
   */
  private getCached<T>(key: string, type: string): T | null {
    // Check memory cache first (fastest)
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && Date.now() - memoryCached.timestamp < MEMORY_CACHE_TIMEOUT_MS) {
      return memoryCached.data as T;
    }
    this.memoryCache.delete(key);

    // Check database cache (persistent)
    if (this.dbService) {
      const dbCached = this.dbService.getEdsmCache<T>(key);
      if (dbCached) {
        // Promote to memory cache for faster subsequent access
        this.memoryCache.set(key, { data: dbCached, timestamp: Date.now() });
        return dbCached;
      }
    }

    return null;
  }

  /**
   * Store data in both memory and database cache
   */
  private setCache(key: string, type: string, data: unknown): void {
    // Store in memory cache
    this.memoryCache.set(key, { data, timestamp: Date.now() });
    
    // Limit cache size to prevent unbounded growth
    if (this.memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
      // Remove oldest entries (sort by timestamp, delete oldest half)
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, Math.floor(entries.length / 2));
      for (const [k] of toDelete) {
        this.memoryCache.delete(k);
      }
      logDebug('EDSM', `Memory cache exceeded ${MAX_MEMORY_CACHE_SIZE}; removed ${toDelete.length} oldest entries`);
    }
    
    // Store in database cache for persistence
    if (this.dbService) {
      this.dbService.setEdsmCache(key, type, data, DB_CACHE_EXPIRY_HOURS);
    }
  }

  async getSystem(systemName: string): Promise<EDSMSystemInfo | null> {
    const cacheKey = `system:${systemName}`;
    const cached = this.getCached<EDSMSystemInfo>(cacheKey, 'system');
    if (cached) {
      logInfo('EDSM', isDev() ? `Cache hit for system: ${systemName}` : 'Cache hit');
      return cached;
    }

    try {
      const url = new URL(`${EDSM_API_BASE}/api-v1/system`);
      url.searchParams.set('systemName', systemName);
      url.searchParams.set('showId', '1');
      url.searchParams.set('showCoordinates', '1');
      url.searchParams.set('showInformation', '1');
      url.searchParams.set('showPrimaryStar', '1');

      logDebug('EDSM', isDev() ? `Fetching system: ${url.toString()}` : 'Fetching system');
      const response = await this.fetchWithRetry(url.toString());
      
      if (!response) {
        logInfo('EDSM', isDev() ? `No response for system: ${systemName}` : 'No response');
        return null;
      }

      const data = await response.json();
      if (isDev()) logDebug('EDSM', `Response for ${systemName}: ${JSON.stringify(data).substring(0, 200)}`);
      
      // EDSM returns empty object if system not found
      if (!data || Object.keys(data).length === 0) {
        logInfo('EDSM', isDev() ? `Empty response for system: ${systemName}` : 'Empty response');
        return null;
      }

      this.setCache(cacheKey, 'system', data);
      return data as EDSMSystemInfo;
    } catch (error) {
      this.lastError = `EDSM request failed: ${(error as Error).message}`;
      logError('EDSM', 'Request failed', error);
      return null;
    }
  }

  async getSystemBodies(systemName: string): Promise<EDSMBodiesResponse | null> {
    const cacheKey = `bodies:${systemName}`;
    const cached = this.getCached<EDSMBodiesResponse>(cacheKey, 'bodies');
    if (cached) return cached;

    try {
      const url = new URL(`${EDSM_API_BASE}/api-system-v1/bodies`);
      url.searchParams.set('systemName', systemName);

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response) {
        return null;
      }

      const data = await response.json();
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      this.setCache(cacheKey, 'bodies', data);
      return data as EDSMBodiesResponse;
    } catch (error) {
      this.lastError = `EDSM request failed: ${(error as Error).message}`;
      logError('EDSM', 'Request failed', error);
      return null;
    }
  }

  async getSystemValue(systemName: string): Promise<EDSMValueResponse | null> {
    const cacheKey = `value:${systemName}`;
    const cached = this.getCached<EDSMValueResponse>(cacheKey, 'value');
    if (cached) return cached;

    try {
      const url = new URL(`${EDSM_API_BASE}/api-system-v1/estimated-value`);
      url.searchParams.set('systemName', systemName);

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response) {
        return null;
      }

      const data = await response.json();
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      this.setCache(cacheKey, 'value', data);
      return data as EDSMValueResponse;
    } catch (error) {
      this.lastError = `EDSM request failed: ${(error as Error).message}`;
      logError('EDSM', 'Request failed', error);
      return null;
    }
  }

  /**
   * Get just the body count without full body details
   * This is what we show before the player scans
   */
  async getSystemBodyCount(systemName: string): Promise<number | null> {
    const systemInfo = await this.getSystem(systemName);
    if (systemInfo?.bodyCount !== undefined) {
      return systemInfo.bodyCount;
    }

    // Fallback to bodies endpoint if system endpoint doesn't have count
    const bodies = await this.getSystemBodies(systemName);
    return bodies?.bodyCount ?? null;
  }

  /**
   * Search systems by name prefix (for autocomplete)
   * Uses /api-v1/systems which supports prefix matching
   */
  async searchSystems(namePrefix: string, limit: number = 10): Promise<EDSMSearchResult[]> {
    if (!namePrefix || namePrefix.trim().length < 2) {
      return [];
    }

    // Don't cache search results as they're dynamic
    try {
      const url = new URL(`${EDSM_API_BASE}/api-v1/systems`);
      url.searchParams.set('systemName', namePrefix.trim());
      url.searchParams.set('showId', '1');
      url.searchParams.set('showCoordinates', '1');
      url.searchParams.set('showPrimaryStar', '1');
      url.searchParams.set('onlyKnownCoordinates', '1');

      logDebug('EDSM', isDev() ? `Searching systems: ${url.toString()}` : 'Searching systems');
      const response = await this.fetchWithRetry(url.toString());
      
      if (!response) {
        logInfo('EDSM', isDev() ? `No response for search: ${namePrefix}` : 'No search response');
        return [];
      }

      const data = await response.json();
      logInfo('EDSM', isDev() ? `Search results: ${Array.isArray(data) ? data.length : 0} systems` : 'Search complete');
      
      // EDSM returns an array for /api-v1/systems
      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Limit results and return
      return (data as EDSMSearchResult[]).slice(0, limit);
    } catch (error) {
      this.lastError = `EDSM search failed: ${(error as Error).message}`;
      logError('EDSM', 'Search failed', error);
      return [];
    }
  }

  /**
   * Clear all caches (memory and database)
   * @param type Optional: only clear entries of a specific type ('system', 'bodies', 'value')
   */
  clearCache(type?: string): void {
    // Clear memory cache
    if (type) {
      const prefix = `${type}:`;
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      this.memoryCache.clear();
    }
    
    // Clear database cache
    if (this.dbService) {
      this.dbService.clearEdsmCache(type);
    }
  }

  /**
   * Clean up expired cache entries from the database
   * @returns Number of entries removed
   */
  cleanupExpiredCache(): number {
    if (this.dbService) {
      return this.dbService.cleanupExpiredEdsmCache();
    }
    return 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCacheSize: number;
    dbStats: {
      totalEntries: number;
      validEntries: number;
      expiredEntries: number;
      sizeBytes: number;
      byType: Record<string, number>;
    } | null;
  } {
    const dbStats = this.dbService?.getEdsmCacheStats() ?? null;
    return {
      memoryCacheSize: this.memoryCache.size,
      dbStats,
    };
  }
}
