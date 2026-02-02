/** Persistent settings via electron-store: journal path, theme, window bounds, value thresholds, zoom defaults; journal validation and Elite path detection. */
import Store from 'electron-store';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { JournalValidationResult, JournalFileInfo } from '../../shared/types';
import { logInfo, logError, logWarn, isDev } from '../logger';

// Loop bounds: limit directory reads to prevent unbounded iteration
const MAX_FILES_TO_CHECK = 10000;

/** Typed get/set for electron-store (Conf base has get/set but ElectronStore type omits them). */
interface StoreLike<T> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
}

interface StoreSchema {
  journalPath: string | null;
  theme: 'light' | 'dark' | 'system';
  showFirstDiscoveryValues: boolean;
  windowBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  isMaximized: boolean;
  hasBackfilled: boolean;
  /** Min CR to highlight body name line as high value (gold, $$$). Default 500k for FSS+DSS high-value. */
  bodyScanHighValue: number;
  /** Min CR to highlight body name line as medium value (orange, $). Default 100k. */
  bodyScanMediumValue: number;
  /** Min CR to highlight biological line as high value (gold). Default 15M. */
  bioHighValue: number;
  /** Min CR to highlight biological line as medium value (orange). Default 7.5M. */
  bioMediumValue: number;
  /** Default icon zoom index (0–5) for Explorer system map. 2 = 100%. */
  defaultIconZoomIndex: number;
  /** Default text zoom index (0–5) for Explorer system map. 2 = 100%. */
  defaultTextZoomIndex: number;
  /** When true, EDSM data shows only body count without revealing body types. */
  edsmSpoilerFree: boolean;
}

const defaults: StoreSchema = {
  journalPath: null,
  theme: 'system',
  showFirstDiscoveryValues: true,
  windowBounds: null,
  isMaximized: false,
  hasBackfilled: false,
  bodyScanHighValue: 500_000,
  bodyScanMediumValue: 100_000,
  bioHighValue: 15_000_000,
  bioMediumValue: 7_500_000,
  defaultIconZoomIndex: 2,
  defaultTextZoomIndex: 2,
  edsmSpoilerFree: false,
};

class SettingsService {
  private store: StoreLike<StoreSchema>;

  /** Create store with defaults; auto-detect journal path on first run if not set. */
  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'settings',
      defaults,
    }) as unknown as StoreLike<StoreSchema>;

    // Try to auto-detect journal path on first run
    if (!this.store.get('journalPath')) {
      const detectedPath = this.detectJournalPath();
      if (detectedPath) {
        this.store.set('journalPath', detectedPath);
      }
    }
  }

  get<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
    return this.store.get(key);
  }

  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
    this.store.set(key, value);
  }

  getJournalPath(): string | null {
    return this.store.get('journalPath');
  }

  /**
   * Set journal path with validation
   * Returns true if successful, throws error if validation fails
   */
  setJournalPath(journalPath: string): void {
    // Validate before saving
    const validation = this.validateJournalFolder(journalPath);
    
    // Only reject if there are actual errors (not just warnings)
    if (validation.errors.length > 0) {
      throw new Error(validation.errors.join('; '));
    }
    
    // Normalize and save the path
    const normalizedPath = this.expandEnvVariables(journalPath);
    this.store.set('journalPath', normalizedPath);
  }

  /**
   * Set journal path without validation (for internal use)
   */
  setJournalPathUnchecked(journalPath: string): void {
    this.store.set('journalPath', journalPath);
  }

  // Window state management
  getIsMaximized(): boolean {
    return this.store.get('isMaximized') ?? false;
  }

  setIsMaximized(isMaximized: boolean): void {
    this.store.set('isMaximized', isMaximized);
  }

  getWindowBounds(): { x: number; y: number; width: number; height: number } | null {
    return this.store.get('windowBounds');
  }

  setWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.store.set('windowBounds', bounds);
  }

  private detectJournalPath(): string | null {
    // Default Elite Dangerous journal location
    const userProfile = os.homedir();
    const defaultPath = path.join(
      userProfile,
      'Saved Games',
      'Frontier Developments',
      'Elite Dangerous'
    );

    if (fs.existsSync(defaultPath)) {
      // Verify it contains journal files
      const allFiles = fs.readdirSync(defaultPath);
      const files = allFiles.slice(0, MAX_FILES_TO_CHECK);
      const hasJournals = files.some(
        f => f.startsWith('Journal.') && f.endsWith('.log')
      );
      
      if (hasJournals) {
        return defaultPath;
      }
    }

    // Try alternative locations (e.g., if installed via Steam on different drive)
    // These are less common but worth checking
    const alternativePaths = [
      path.join('D:', 'Saved Games', 'Frontier Developments', 'Elite Dangerous'),
      path.join('E:', 'Saved Games', 'Frontier Developments', 'Elite Dangerous'),
    ];

    for (const altPath of alternativePaths) {
      if (fs.existsSync(altPath)) {
        const allFiles = fs.readdirSync(altPath);
        const files = allFiles.slice(0, MAX_FILES_TO_CHECK);
        const hasJournals = files.some(
          f => f.startsWith('Journal.') && f.endsWith('.log')
        );
        
        if (hasJournals) {
          return altPath;
        }
      }
    }

    return null;
  }

  hasBackfilled(): boolean {
    return this.store.get('hasBackfilled');
  }

  setBackfilled(value: boolean): void {
    this.store.set('hasBackfilled', value);
  }

  getTheme(): 'light' | 'dark' | 'system' {
    return this.store.get('theme');
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.store.set('theme', theme);
  }

  /**
   * Validates a journal folder path and returns detailed information
   */
  validateJournalFolder(folderPath: string): JournalValidationResult {
    const result: JournalValidationResult = {
      isValid: false,
      exists: false,
      isReadable: false,
      journalCount: 0,
      latestJournal: null,
      latestJournalDate: null,
      eliteInstalled: false,
      errors: [],
      warnings: [],
      recentJournals: [],
    };

    // Normalize the path (handle %USERPROFILE% and other env vars)
    const normalizedPath = this.expandEnvVariables(folderPath);

    // Check if folder exists
    if (!fs.existsSync(normalizedPath)) {
      result.errors.push('Folder does not exist');
      return result;
    }
    result.exists = true;

    // Check if it's a directory
    try {
      const stats = fs.statSync(normalizedPath);
      if (!stats.isDirectory()) {
        result.errors.push('Path is not a directory');
        return result;
      }
    } catch (err) {
      result.errors.push('Cannot access folder');
      return result;
    }

    // Check if readable
    try {
      fs.accessSync(normalizedPath, fs.constants.R_OK);
      result.isReadable = true;
    } catch (err) {
      result.errors.push('Folder is not readable. Check permissions.');
      return result;
    }

    // Check for journal files
    try {
      const allFiles = fs.readdirSync(normalizedPath);
      const files = allFiles.slice(0, MAX_FILES_TO_CHECK);
      if (allFiles.length > MAX_FILES_TO_CHECK) {
        logWarn('Settings', `Journal path has ${allFiles.length} files; limiting validation check to ${MAX_FILES_TO_CHECK}`);
      }
      const journalFiles = files.filter(
        f => f.startsWith('Journal.') && f.endsWith('.log')
      );
      result.journalCount = journalFiles.length;

      if (journalFiles.length === 0) {
        result.warnings.push('No journal files found in this folder');
        
        // Check if it might be the wrong folder
        const hasStatus = files.some(f => f === 'Status.json');
        const hasMarket = files.some(f => f.startsWith('Market.'));
        
        if (!hasStatus && !hasMarket) {
          result.warnings.push('This does not appear to be an Elite Dangerous journal folder');
        } else {
          result.warnings.push('Elite Dangerous files found, but no journal logs yet. Have you started the game?');
        }
      } else {
        // Get the latest journal file
        const sortedJournals = journalFiles.sort();
        const latest = sortedJournals[sortedJournals.length - 1];
        result.latestJournal = latest ?? null;

        // Extract date from journal filename (Journal.YYMMDDHHMMSS.01.log)
        const latestJournal = result.latestJournal;
        const dateMatch = latestJournal !== null ? latestJournal.match(/Journal\.(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\./) : null;
        if (dateMatch) {
          const [, year, month, day, hour, minute, second] = dateMatch;
          result.latestJournalDate = `20${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }

        // Mark as valid if we have journals
        result.isValid = true;

        // Check journal age for warnings
        if (result.latestJournalDate) {
          const journalDate = new Date(result.latestJournalDate);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - journalDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff > 30) {
            result.warnings.push(`Latest journal is ${daysDiff} days old. Is Elite Dangerous still installed?`);
          }
        }

        // Get recent journal files info (last 5, most recent first)
        const recentJournals: JournalFileInfo[] = [];
        const recentFiles = sortedJournals.slice(-5).reverse();
        for (const fileName of recentFiles) {
          try {
            const filePath = path.join(normalizedPath, fileName);
            const fileStat = fs.statSync(filePath);
            recentJournals.push({
              name: fileName,
              size: fileStat.size,
              modified: fileStat.mtime.toISOString(),
            });
          } catch {
            // Skip files we can't stat
          }
        }
        result.recentJournals = recentJournals;
      }

      // Check for other Elite files to confirm it's the right folder
      const hasStatus = files.some(f => f === 'Status.json');
      if (hasStatus) {
        result.eliteInstalled = true;
      }

    } catch (err) {
      result.errors.push('Error reading folder contents');
      return result;
    }

    return result;
  }

  /**
   * Expands Windows environment variables in a path
   */
  private expandEnvVariables(inputPath: string): string {
    return inputPath.replace(/%([^%]+)%/g, (_, key) => {
      return process.env[key] || `%${key}%`;
    });
  }

  /**
   * Detects if Elite Dangerous is installed and returns potential journal paths
   */
  detectElitePaths(): string[] {
    const paths: string[] = [];
    const userProfile = os.homedir();

    // Primary location (journals are always stored here regardless of game install location)
    const primaryPath = path.join(
      userProfile,
      'Saved Games',
      'Frontier Developments',
      'Elite Dangerous'
    );
    if (fs.existsSync(primaryPath)) {
      paths.push(primaryPath);
    }

    // Alternative drives (user might have Saved Games on different drive)
    const drives = ['D:', 'E:', 'F:', 'G:'];
    for (const drive of drives) {
      const altPath = path.join(drive, 'Saved Games', 'Frontier Developments', 'Elite Dangerous');
      if (fs.existsSync(altPath) && !paths.includes(altPath)) {
        paths.push(altPath);
      }
    }

    // If we found journal paths, also check if Elite is installed via Steam/Epic
    // This helps validate that the journals are from a real installation
    const steamInstalled = this.checkSteamInstall();
    const epicInstalled = this.checkEpicInstall();

    // Log detection results (no full paths in production)
    if (isDev()) {
      logInfo('Settings', `Elite Dangerous detection: ${paths.length} path(s), steam=${steamInstalled}, epic=${epicInstalled}`);
    } else {
      logInfo('Settings', `Elite Dangerous detection: ${paths.length} path(s) found`);
    }

    return paths;
  }

  /**
   * Check if Elite Dangerous is installed via Steam by parsing libraryfolders.vdf
   */
  private checkSteamInstall(): boolean {
    const ELITE_STEAM_APP_ID = '359320';
    const steamLibraryPaths = this.getSteamLibraryPaths();

    for (const libraryPath of steamLibraryPaths) {
      // Check if Elite Dangerous is installed in this library
      const elitePath = path.join(libraryPath, 'steamapps', 'common', 'Elite Dangerous');
      if (fs.existsSync(elitePath)) {
        return true;
      }

      // Also check appmanifest file
      const manifestPath = path.join(libraryPath, 'steamapps', `appmanifest_${ELITE_STEAM_APP_ID}.acf`);
      if (fs.existsSync(manifestPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse Steam's libraryfolders.vdf to get all library paths
   */
  private getSteamLibraryPaths(): string[] {
    const libraryPaths: string[] = [];

    // Common Steam install locations
    const steamPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'D:\\SteamLibrary',
      'E:\\Steam',
      'E:\\SteamLibrary',
    ];

    // Try to find and parse libraryfolders.vdf
    for (const steamPath of steamPaths) {
      const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
      if (fs.existsSync(vdfPath)) {
        try {
          const content = fs.readFileSync(vdfPath, 'utf-8');
          const parsedPaths = this.parseVdfLibraryPaths(content);
          libraryPaths.push(...parsedPaths);
        } catch (err) {
          logError('Settings', 'Failed to parse Steam libraryfolders.vdf', err);
        }
        break; // Found Steam, no need to check other paths
      }
    }

    // Add Steam paths themselves as potential library locations
    for (const steamPath of steamPaths) {
      if (fs.existsSync(steamPath) && !libraryPaths.includes(steamPath)) {
        libraryPaths.push(steamPath);
      }
    }

    return libraryPaths;
  }

  /**
   * Parse VDF format to extract library paths
   * VDF is a simple key-value format used by Valve/Steam
   */
  private parseVdfLibraryPaths(content: string): string[] {
    const paths: string[] = [];

    // Simple regex-based parser for VDF format
    // Matches "path" values in the format: "path"		"C:\\path\\to\\library"
    const pathRegex = /"path"\s+"([^"]+)"/gi;
    let match;

    while ((match = pathRegex.exec(content)) !== null) {
      // Unescape the path (VDF escapes backslashes)
      const pathSegment = match[1];
      if (pathSegment === undefined) continue;
      const libraryPath = pathSegment.replace(/\\\\/g, '\\');
      if (fs.existsSync(libraryPath)) {
        paths.push(libraryPath);
      }
    }

    return paths;
  }

  /**
   * Check if Elite Dangerous is installed via Epic Games Store
   */
  private checkEpicInstall(): boolean {
    // Common Epic Games install locations
    const epicPaths = [
      'C:\\Program Files\\Epic Games\\EliteDangerous',
      'C:\\Program Files (x86)\\Epic Games\\EliteDangerous',
      'D:\\Epic Games\\EliteDangerous',
      'E:\\Epic Games\\EliteDangerous',
    ];

    // Check Epic manifests directory for Elite installation
    const epicManifestsPath = path.join(
      process.env.PROGRAMDATA || 'C:\\ProgramData',
      'Epic',
      'EpicGamesLauncher',
      'Data',
      'Manifests'
    );

    if (fs.existsSync(epicManifestsPath)) {
      try {
        const allManifests = fs.readdirSync(epicManifestsPath);
        const manifestFiles = allManifests.slice(0, MAX_FILES_TO_CHECK);
        for (const file of manifestFiles) {
          if (file.endsWith('.item')) {
            const manifestPath = path.join(epicManifestsPath, file);
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            try {
              const manifest = JSON.parse(manifestContent);
              // Check if this manifest is for Elite Dangerous
              if (manifest.DisplayName && 
                  (manifest.DisplayName.includes('Elite Dangerous') || 
                   manifest.DisplayName.includes('Elite: Dangerous'))) {
                return true;
              }
            } catch {
              // Skip invalid JSON files
            }
          }
        }
      } catch (err) {
        logError('Settings', 'Failed to check Epic manifests', err);
      }
    }

    // Fallback: check common install paths
    for (const epicPath of epicPaths) {
      if (fs.existsSync(epicPath)) {
        return true;
      }
    }

    return false;
  }
}

export default SettingsService;
