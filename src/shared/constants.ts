/** Default Elite Dangerous journal folder (Windows); used when journal path is not set. */
export const DEFAULT_JOURNAL_PATH = '%USERPROFILE%\\Saved Games\\Frontier Developments\\Elite Dangerous';

/** EDSM API base URL and rate limit (1 req/s) for system/bodies lookups. */
export const EDSM_API_BASE = 'https://www.edsm.net';
export const EDSM_RATE_LIMIT_MS = 1000; // 1 request per second

/** SQLite database filename; stored in app user data. */
export const DB_NAME = 'galnetops.db';

/** Galactic records cache filename; stored in app user data. */
export const GALACTIC_RECORDS_FILENAME = 'galactic-records.json';

/** Minimum age (days) before re-scraping galactic records. */
export const GALACTIC_RECORDS_MAX_AGE_DAYS = 7;
