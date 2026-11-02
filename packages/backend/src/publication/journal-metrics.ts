// Journal impact factor and JCR quartile, from the operator's own metric tables (journal_metrics.csv /
// journal_quartiles.csv, JCR 2026). The tables are operator-supplied data and stay out of the repo: the
// directory comes from JOURNAL_METRICS_DIR, and a missing or unreadable table only means no metrics are
// shown — a label is never invented for a journal the table does not name.
import { readFileSync } from "node:fs";
import path from "node:path";

export interface JournalMetrics {
  impactFactor: string | null;
  quartile: string | null;
  source: string | null;
}

let table: Map<string, JournalMetrics> | null = null;
let loaded = false;

export const normalizeJournalName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** One CSV line split on commas that are not inside double quotes. */
function csvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') quoted = false;
      else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { cells.push(current); current = ""; }
    else current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function readRows(file: string): string[][] {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(csvLine);
}

function load(): void {
  if (loaded) return;
  loaded = true;
  const dir = process.env.JOURNAL_METRICS_DIR;
  if (!dir) return;
  try {
    const map = new Map<string, JournalMetrics>();
    const metrics = readRows(path.join(dir, "journal_metrics.csv"));
    const header = metrics[0] ?? [];
    const j = header.indexOf("journal");
    const value = header.indexOf("metric_value");
    const source = header.indexOf("metric_source");
    for (const row of metrics.slice(1)) {
      if (row[j] && row[value]) map.set(normalizeJournalName(row[j]), { impactFactor: row[value], quartile: null, source: row[source] || null });
    }
    for (const row of readRows(path.join(dir, "journal_quartiles.csv")).slice(1)) {
      const hit = map.get(normalizeJournalName(row[0]));
      if (hit && row[1]) { hit.quartile = row[1]; hit.source = hit.source || null; }
    }
    table = map;
  } catch {
    table = null; // A bad path or a broken table stays silent: metrics are decorative, never load-bearing.
  }
}

/** Metrics for a journal name as the deposit wrote it; null when the table is absent or the name misses. */
export function journalMetricsFor(journal: string | null | undefined): JournalMetrics | null {
  load();
  if (!table || !journal) return null;
  return table.get(normalizeJournalName(journal)) ?? null;
}

/**
 * Journal-directory sources (RSS) carry no deposit metadata, so their papers name no journal of their
 * own; each such source id maps to the journal whose table row it publishes. Ids outside the map (news,
 * the WHO page) get no metrics.
 */
const SOURCE_JOURNAL: Record<string, string> = {
  "rss-plos-ntd": "PLOS Neglected Tropical Diseases",
  "rss-plos-pathogens": "PLOS Pathogens",
  "rss-plos-compbiol": "PLoS Computational Biology",
  "rss-nature-microbiology": "Nature Microbiology",
  "rss-trends-parasitology": "Trends in Parasitology",
  "rss-emi": "Emerging Microbes & Infections",
  "rss-cdc-eid": "Emerging Infectious Diseases",
};

/** Metrics for a listing item: its deposited journal, else its journal-directory source's own. */
export function journalMetricsForItem(journal: string | null | undefined, sourceId: string | null | undefined): JournalMetrics | null {
  return journalMetricsFor(journal || (sourceId ? SOURCE_JOURNAL[sourceId] : undefined));
}

/** The journal a directory source publishes, for display when no deposit metadata exists. */
export function journalNameForSource(sourceId: string | null | undefined): string | null {
  return sourceId ? SOURCE_JOURNAL[sourceId] ?? null : null;
}
