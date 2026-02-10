/** Parse EDAstro records HTML: values, EDSM links, attribute sections, Top10/Bottom10. */
import type { CheerioAPI } from 'cheerio';
import type { AttributeRecord, RankedEntry, RecordBodyRef, RecordEntry } from '../../../shared/galacticRecords';

export function toCamelCase(str: string): string {
  return str
    .trim()
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase())
    .replace(/\s/g, '');
}

/**
 * Parse numeric value from cell text. Handles commas, scientific notation, optional unit suffix.
 */
export function parseValue(text: string): number {
  const cleaned = text.trim().replace(/,/g, '');
  const unitMatch = cleaned.match(/^([-\d.e+]+)/);
  if (unitMatch && unitMatch[1] !== undefined) {
    return parseFloat(unitMatch[1]);
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse EDSM link from href. Format: .../id/{sysId}/name/{sysName}/details/idB/{bodyId}/nameB/{bodyName}
 */
export function parseEDSMLink(href: string | undefined, linkText: string): RecordBodyRef {
  if (!href) return { name: linkText.trim() };
  const fullUrl = href.startsWith('http') ? href : `https://www.edsm.net${href}`;
  const match = href.match(/id\/(\d+)\/name\/([^/]+)\/details\/idB\/(\d+)\/nameB\/(.+)$/);
  if (match && match[1] !== undefined && match[3] !== undefined && match[4] !== undefined) {
    return {
      name: decodeURIComponent(match[4].replace(/\+/g, ' ')).trim() || linkText.trim(),
      systemId: parseInt(match[1], 10),
      bodyId: parseInt(match[3], 10),
      edsmUrl: fullUrl,
    };
  }
  return { name: linkText.trim() };
}

function parseRecordEntry(value: number, $cell: ReturnType<CheerioAPI>, $link: ReturnType<CheerioAPI>): RecordEntry {
  const body = parseEDSMLink($link.attr('href'), $link.text().trim());
  const cellText = $cell.text().trim();
  const sharedMatch = cellText.match(/\*\s*$/);
  const sharedCountMatch = cellText.match(/(\d[\d,]*)\s*\*$/);
  const sharedCount =
    sharedCountMatch && sharedCountMatch[1] !== undefined
      ? parseInt(sharedCountMatch[1].replace(/,/g, ''), 10)
      : undefined;
  const optionalShared =
    sharedCount != null && sharedCount > 1 ? { sharedCount } : {};
  return { value, body, ...optionalShared };
}

function parseTop10Bottom10($: CheerioAPI, $row4: ReturnType<CheerioAPI>): { top10: RankedEntry[]; bottom10: RankedEntry[] } {
  const top10: RankedEntry[] = [];
  const bottom10: RankedEntry[] = [];
  const $nested = $row4.find('table');
  if ($nested.length === 0) return { top10, bottom10 };

  const $rows = $nested.find('tr').toArray();
  // Skip header row(s). Data rows: columns 1=top value, 2=top body, 5=bottom value, 6=bottom body
  for (let i = 1; i < $rows.length && (top10.length < 10 || bottom10.length < 10); i++) {
    const $row = $($rows[i]);
    const tds = $row.find('td').toArray();
    if (tds.length >= 7) {
      const td1 = tds[1];
      const td2 = tds[2];
      const td5 = tds[5];
      const td6 = tds[6];
      if (td1 !== undefined && td2 !== undefined && td5 !== undefined && td6 !== undefined) {
        const topVal = parseValue($(td1).text());
        const topBody = $(td2).text().trim();
        const botVal = parseValue($(td5).text());
        const botBody = $(td6).text().trim();
        if (top10.length < 10 && (topVal !== 0 || topBody)) {
          top10.push({ rank: top10.length + 1, value: topVal, bodyName: topBody });
        }
        if (bottom10.length < 10 && (botVal !== 0 || botBody)) {
          bottom10.push({ rank: bottom10.length + 1, value: botVal, bodyName: botBody });
        }
      }
    }
  }
  return { top10, bottom10 };
}

/**
 * Parse one attribute record section (group of rows: attr+highest, lowest, blank, average, count+stdDev+top10).
 */
export function parseRecordSection($: CheerioAPI, rows: ReturnType<CheerioAPI>[]): AttributeRecord | null {
  if (rows.length < 5) return null;

  const $r0 = $(rows[0]);
  const $r1 = $(rows[1]);
  const $r3 = $(rows[3]);
  const $r4 = $(rows[4]);

  const attrName = $r0.find('b').first().text().trim();
  if (!attrName) return null;

  const key = toCamelCase(attrName);

  const highestValCell = $r0.find('td').eq(3);
  const highestVal = parseValue(highestValCell.text());
  const highestLink = $r0.find('a').first();
  const highest = parseRecordEntry(highestVal, highestValCell, highestLink);

  const lowestValCell = $r1.find('td').eq(2);
  const lowestVal = parseValue(lowestValCell.text());
  const lowestLink = $r1.find('a').first();
  const lowest = parseRecordEntry(lowestVal, lowestValCell, lowestLink);

  const average = parseValue($r3.find('td').eq(2).text());
  const countText = $r4.find('td').eq(0).text();
  const count = parseInt(countText.replace(/\D/g, ''), 10) || 0;
  const standardDeviation = parseValue($r4.find('td').eq(3).text());

  const { top10, bottom10 } = parseTop10Bottom10($, $r4);

  return {
    name: attrName,
    key,
    highest,
    lowest,
    statistics: { average, count, standardDeviation },
    top10,
    bottom10,
  };
}

/**
 * Find all record section row indices. Each section starts with a row containing <b> and "Highest:".
 */
export function findRecordSectionStarts($: CheerioAPI, $rows: ReturnType<CheerioAPI>[]): number[] {
  const starts: number[] = [];
  $rows.forEach((row, i) => {
    const text = row.text();
    const hasBold = row.find('b').length > 0;
    if (hasBold && text.includes('Highest:')) {
      starts.push(i);
    }
  });
  return starts;
}
