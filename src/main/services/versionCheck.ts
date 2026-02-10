/**
 * Check for new app version via GitHub Releases API.
 * Compares current version with latest release tag; notifies renderer if newer.
 */

const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/Ma77h3hac83r/GalNetOps/releases/latest';

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  url?: string;
}

/**
 * Parse a version string (e.g. "1.0.0-beta.1.1" or "v1.0.0") into comparable parts.
 * Returns [major, minor, patch, prerelease] where prerelease is the rest as string for lexicographic compare.
 */
function parseVersion(version: string): [number, number, number, string] {
  const normalized = version.replace(/^v/i, '').trim();
  const dash = normalized.indexOf('-');
  const core = dash >= 0 ? normalized.slice(0, dash) : normalized;
  const prerelease = dash >= 0 ? normalized.slice(dash + 1) : '';
  const parts = core.split('.').map((p) => parseInt(p, 10) || 0);
  const [major = 0, minor = 0, patch = 0] = parts;
  return [major, minor, patch, prerelease];
}

/**
 * Return true if latestVersion is strictly greater than currentVersion.
 */
export function isNewerVersion(currentVersion: string, latestVersion: string): boolean {
  const cur = parseVersion(currentVersion);
  const lat = parseVersion(latestVersion);
  if (lat[0] !== cur[0]) return lat[0] > cur[0];
  if (lat[1] !== cur[1]) return lat[1] > cur[1];
  if (lat[2] !== cur[2]) return lat[2] > cur[2];
  // Same major.minor.patch: prerelease "beta.1.2" > "beta.1.1", and release "" < any prerelease
  if (cur[3] === lat[3]) return false;
  if (cur[3] === '') return false; // current is release, latest is prerelease → still "newer" for our prompt
  if (lat[3] === '') return true;  // latest is release, current is prerelease
  return lat[3].localeCompare(cur[3], undefined, { numeric: true }) > 0;
}

/**
 * Fetch latest release from GitHub and compare with currentVersion.
 * Returns { available, version, url } when a newer version exists; { available: false } otherwise.
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return { available: false };

    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    const tagName = typeof data?.tag_name === 'string' ? data.tag_name : '';
    const url = typeof data?.html_url === 'string' ? data.html_url : undefined;

    if (!tagName) return { available: false };

    const latestVersion = tagName.replace(/^v/i, '').trim();
    if (!latestVersion || !isNewerVersion(currentVersion, latestVersion)) {
      return { available: false };
    }

    const releasesPage = 'https://github.com/Ma77h3hac83r/GalNetOps/releases';
    return {
      available: true,
      version: latestVersion,
      url: url || releasesPage,
    };
  } catch {
    return { available: false };
  }
}
