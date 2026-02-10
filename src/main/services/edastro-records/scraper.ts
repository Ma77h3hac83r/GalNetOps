/** EDAstro galactic records scraper: fetch HTML and parse record pages. */
import * as cheerio from 'cheerio';
import type { GalacticRecord } from '../../../shared/galacticRecords';
import {
  findRecordSectionStarts,
  parseRecordSection,
} from './parser';
import { logInfo, logWarn, logError } from '../../logger';

const BASE_URL = 'https://edastro.com/records/';
const REQUEST_DELAY_MS = 1500; // ~1.5s between requests to be respectful
const USER_AGENT = 'GalNetOps/1.0 (Elite Dangerous Companion App)';

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function extractMetadata($: cheerio.CheerioAPI): { lastUpdated: string; bodyType: string } {
  const bodyText = $('body').text();
  const updateMatch = bodyText.match(/Last update:\s*([\d-]+\s+[\d:]+)/);
  const lastUpdated =
    updateMatch && updateMatch[1] !== undefined
      ? `${updateMatch[1].replace(' ', 'T')}Z`
      : new Date().toISOString();
  const bodyType = $('h2').first().text().trim() || 'Unknown';
  return { lastUpdated, bodyType };
}

export async function scrapeBodyType(
  bodyTypeSlug: string,
  scrapedAt: string
): Promise<GalacticRecord | null> {
  const url = `${BASE_URL}${bodyTypeSlug}.html`;
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const { lastUpdated, bodyType } = extractMetadata($);

    const rows = $('table tr').toArray();
    const starts = findRecordSectionStarts($, rows.map((el) => $(el)));

    const attributes: GalacticRecord['attributes'] = [];
    for (const start of starts) {
      const sectionRows = rows.slice(start, start + 5);
      if (sectionRows.length < 5) continue;
      const $sectionRows = sectionRows.map((el) => $(el));
      const attr = parseRecordSection($, $sectionRows);
      if (attr) attributes.push(attr);
    }

    return {
      bodyType,
      bodyTypeSlug,
      sourceUrl: url,
      lastUpdated,
      scrapedAt,
      attributes,
    };
  } catch (err) {
    logError('EDAstro Records', `Failed to scrape ${bodyTypeSlug}`, err);
    return null;
  }
}

/** Body type slugs to scrape (subset for reasonable run time; can be expanded). */
export const DEFAULT_BODY_TYPE_SLUGS = [
  'O_Blue_White_Star',
  'B_Blue_White_Star',
  'A_Blue_White_Star',
  'F_White_Star',
  'G_White_Yellow_Star',
  'K_Yellow_Orange_Star',
  'M_Red_dwarf_Star',
  'White_Dwarf_D_Star',
  'Neutron_Star',
  'Black_Hole',
  'Earth_like_world',
  'Water_world',
  'Metal_rich_body',
  'High_metal_content_world',
];

export async function scrapeAllBodyTypes(
  bodyTypeSlugs: string[] = DEFAULT_BODY_TYPE_SLUGS,
  onProgress?: (current: number, total: number, slug: string) => void
): Promise<GalacticRecord[]> {
  const scrapedAt = new Date().toISOString();
  const results: GalacticRecord[] = [];
  const total = bodyTypeSlugs.length;

  for (let i = 0; i < bodyTypeSlugs.length; i++) {
    const slug = bodyTypeSlugs[i]!;
    if (onProgress) onProgress(i + 1, total, slug);
    const record = await scrapeBodyType(slug, scrapedAt);
    if (record) {
      results.push(record);
      logInfo('EDAstro Records', `Scraped ${slug} (${record.attributes.length} attributes)`);
    } else {
      logWarn('EDAstro Records', `Skipped ${slug}`);
    }
    if (i < bodyTypeSlugs.length - 1) {
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  return results;
}
