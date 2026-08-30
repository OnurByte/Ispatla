/* External MediaWiki payloads are schemaless; this script validates the normalized output instead. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const DATA = join(ROOT, "data");
const DEBUG = join(DATA, "debug");
const CACHE = join(ROOT, ".cache", "ideologies");
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "Ispatla ideology dataset bot/1.0 (https://github.com/OnurByte/Ispatla)";
const REQUIRED_TITLES = [
  "Liberalism", "Classical liberalism", "Social liberalism", "Neoliberalism", "Socialism", "Democratic socialism",
  "Communism", "Marxism", "Marxism–Leninism", "Conservatism", "Nationalism", "Civic nationalism", "Ethnic nationalism",
  "Turkish nationalism", "Kurdish nationalism", "Pan-Turkism", "Kemalism", "Ulusalism", "Zionism", "Anti-Zionism",
  "Religious Zionism", "Christian Zionism", "Islamism", "Pan-Islamism", "Neo-Ottomanism", "Anarchism", "Fascism", "National Bolshevism",
  "Anti-Kemalism",
];
const OPPOSITIONS: Record<string, string[]> = { "anti-zionism": ["zionism"], zionism: ["anti-zionism"] };

export type Ideology = {
  id: string; qid: string | null;
  name: { en: string; tr: string };
  aliases: { en: string[]; tr: string[] };
  description: { en: string; tr: string };
  sectionPath: string[];
  types: string[]; parents: string[]; related: string[]; opposes: string[];
  relationEvidence: Record<string, { id: string; qid: string | null; property: string }[]>;
  wikipedia: { en: string; tr: string | null };
  sources: { wikipedia: string; wikidata: string | null; match: { method: string; confidence: number } };
};
export type Dataset = { metadata: { generatedAt: string; total: number; withWikidata: number; withoutWikidata: number; sources: string[] }; ideologies: Ideology[] };
type Seed = { title: string; label: string; sectionPath: string[] };
type Entity = Record<string, any>;

function wait(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function cachePath(url: string) { return join(CACHE, `${createHash("sha256").update(url).digest("hex")}.json`); }
async function json(url: string): Promise<any> {
  const path = cachePath(url);
  try { return JSON.parse(await readFile(path, "utf8")); } catch { /* cache miss */ }
  let failure: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await wait(150);
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const value = await response.json();
      await mkdir(CACHE, { recursive: true });
      await writeFile(path, JSON.stringify(value));
      return value;
    } catch (error) { failure = error; await wait(500 * 2 ** attempt); }
  }
  throw failure instanceof Error ? failure : new Error("Wikipedia/Wikidata request failed");
}
function api(base: string, params: Record<string, string>) { const url = new URL(base); Object.entries({ format: "json", formatversion: "2", maxlag: "5", ...params }).forEach(([key, value]) => url.searchParams.set(key, value)); return url.toString(); }
function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
export function slugify(value: string): string { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLocaleLowerCase("en-US"); }
function wikiUrl(title: string, language = "en") { return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`; }
function claimIds(entity: Entity, property: string): string[] { return (entity.claims?.[property] || []).flatMap((claim: any): string[] => claim.mainsnak?.datavalue?.value?.id ? [claim.mainsnak.datavalue.value.id as string] : []); }
function term(entity: Entity, key: "labels" | "descriptions", language: string, fallback = "") { return entity[key]?.[language]?.value || fallback; }
function aliases(entity: Entity, language: string) { return unique((entity.aliases?.[language] || []).map((item: any) => item.value)); }

export function parseSeeds(wikitext: string): Seed[] {
  const result: Seed[] = []; let path: { level: number; title: string }[] = [];
  for (const line of wikitext.split("\n")) {
    const heading = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (heading) { const level = heading[1].length; path = [...path.filter((item) => item.level < level), { level, title: heading[2].replace(/<[^>]+>/g, "").trim() }]; continue; }
    if (!/^\*+\s/.test(line)) continue;
    for (const link of line.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g)) {
      const title = link[1].trim(); const label = (link[2] || title).replace(/<[^>]+>/g, "").trim();
      if (!/^(File|Category|Help|Template|Portal|List of ):/i.test(title)) result.push({ title, label, sectionPath: path.map((item) => item.title) });
    }
  }
  for (const title of REQUIRED_TITLES) result.push({ title, label: title, sectionPath: ["Required coverage"] });
  const seen = new Set<string>();
  return result.filter((seed) => { const key = slugify(seed.title); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
async function getPageMappings(titles: string[]) {
  const mappings = new Map<string, { qid: string | null; title: string; redirected: boolean }>();
  for (let index = 0; index < titles.length; index += 50) {
    const value = await json(api(WIKIPEDIA_API, { action: "query", redirects: "1", prop: "pageprops", ppprop: "wikibase_item", titles: titles.slice(index, index + 50).join("|") }));
    for (const page of value.query?.pages || []) mappings.set(slugify(page.title), { qid: page.pageprops?.wikibase_item || null, title: page.title, redirected: false });
    for (const redirect of value.query?.redirects || []) { const target = mappings.get(slugify(redirect.to)); if (target) mappings.set(slugify(redirect.from), { ...target, redirected: true }); }
  }
  return mappings;
}
async function getEntities(qids: string[]) {
  const entities = new Map<string, Entity>();
  for (let index = 0; index < qids.length; index += 50) {
    const value = await json(api(WIKIDATA_API, { action: "wbgetentities", ids: qids.slice(index, index + 50).join("|"), props: "labels|aliases|descriptions|claims|sitelinks/urls", languages: "en|tr", languagefallback: "1" }));
    for (const [qid, entity] of Object.entries(value.entities || {})) if (!(entity as Entity).missing) entities.set(qid, entity as Entity);
  }
  return entities;
}
async function fuzzyEntity(title: string): Promise<{ qid: string; confidence: number } | null> {
  const value = await json(api(WIKIDATA_API, { action: "wbsearchentities", search: title, language: "en", limit: "1", type: "item" }));
  const candidate = value.search?.[0]; if (!candidate) return null;
  const a = slugify(title); const b = slugify(candidate.label || "");
  const confidence = a === b ? 0.99 : a.includes(b) || b.includes(a) ? 0.96 : 0;
  return confidence >= 0.96 ? { qid: candidate.id, confidence } : null;
}
function cycles(records: Ideology[]) { const byId = new Map(records.map((item) => [item.id, item])); const visited = new Set<string>(); const stack = new Set<string>(); const found: string[][] = []; const visit = (id: string, chain: string[]) => { if (stack.has(id)) { found.push([...chain, id]); return; } if (visited.has(id)) return; visited.add(id); stack.add(id); for (const parent of byId.get(id)?.parents || []) visit(parent, [...chain, id]); stack.delete(id); }; for (const item of records) visit(item.id, []); return found; }
function removeParentCycles(records: Ideology[], conflicts: any[]) { for (const chain of cycles(records)) { const from = chain.at(-2); const to = chain.at(-1); const record = records.find((item) => item.id === from); if (record && to) { record.parents = record.parents.filter((parent) => parent !== to); record.relationEvidence.parents = record.relationEvidence.parents.filter((item) => item.id !== to); conflicts.push({ id: from, reason: "parent cycle removed", removedParent: to, chain }); } } }
export function validateDataset(dataset: Dataset) {
  const errors: string[] = []; const ids = new Set<string>(); const qids = new Set<string>(); const byId = new Set(dataset.ideologies.map((item) => item.id));
  for (const item of dataset.ideologies) { if (!item.id || !item.name.en.trim()) errors.push(`empty name/id: ${item.id}`); if (ids.has(item.id)) errors.push(`duplicate id: ${item.id}`); ids.add(item.id); if (item.qid && qids.has(item.qid)) errors.push(`duplicate qid: ${item.qid}`); if (item.qid) qids.add(item.qid); for (const relation of ["parents", "related", "opposes"] as const) for (const target of item[relation]) { if (target === item.id) errors.push(`self relation: ${item.id}`); if (!byId.has(target)) errors.push(`orphan relation: ${item.id} -> ${target}`); } if (![item.wikipedia.en, item.wikipedia.tr].filter(Boolean).every((url) => /^https:\/\/(en|tr)\.wikipedia\.org\/wiki\//.test(url!))) errors.push(`malformed url: ${item.id}`); }
  for (const chain of cycles(dataset.ideologies)) errors.push(`parent cycle: ${chain.join(" -> ")}`); return errors;
}
async function atomicWrite(path: string, value: unknown, pretty = true) { await mkdir(dirname(path), { recursive: true }); const tmp = `${path}.tmp`; await writeFile(tmp, JSON.stringify(value, null, pretty ? 2 : undefined) + (pretty ? "\n" : "")); await rename(tmp, path); }

export async function buildDataset() {
  const parsed = await json(api(WIKIPEDIA_API, { action: "parse", page: "List of political ideologies", prop: "wikitext" }));
  const seeds = parseSeeds(parsed.parse?.wikitext || ""); const mappings = await getPageMappings(seeds.map((seed) => seed.title));
  const unmatched: any[] = []; const conflicts: any[] = []; const matched = new Map<string, { qid: string; method: string; confidence: number; pageTitle: string }>();
  for (const seed of seeds) { const mapped = mappings.get(slugify(seed.title)); if (mapped?.qid) matched.set(slugify(seed.title), { qid: mapped.qid, method: mapped.redirected ? "wikipedia-redirect" : "wikipedia-page", confidence: 1, pageTitle: mapped.title }); else if (REQUIRED_TITLES.includes(seed.title)) { const fuzzy = await fuzzyEntity(seed.title); if (fuzzy) { matched.set(slugify(seed.title), { ...fuzzy, method: "wikidata-search", pageTitle: seed.title }); conflicts.push({ title: seed.title, reason: "fuzzy match accepted; review", ...fuzzy }); } else unmatched.push({ title: seed.title, sectionPath: seed.sectionPath, reason: "no reliable Wikidata mapping" }); } else unmatched.push({ title: seed.title, sectionPath: seed.sectionPath, reason: "no reliable Wikidata mapping" }); }
  const entities = await getEntities(unique([...matched.values()].map((item) => item.qid))); const qidToId = new Map<string, string>(); const used = new Map<string, string>();
  for (const seed of seeds) { const match = matched.get(slugify(seed.title)); const entity = match ? entities.get(match.qid) : undefined; let id = slugify(term(entity || {}, "labels", "en", seed.title)); const duplicate = used.get(id); if (duplicate && duplicate !== (match?.qid || seed.title)) id = `${id}-${(match?.qid || seed.title).toLowerCase()}`; used.set(id, match?.qid || seed.title); if (match) qidToId.set(match.qid, id); }
  const records: Ideology[] = seeds.map((seed) => {
    const match = matched.get(slugify(seed.title)); const entity = match ? entities.get(match.qid) : undefined; const id = qidToId.get(match?.qid || "") || slugify(seed.title);
    const relation = (property: string) => unique(claimIds(entity || {}, property).map((qid) => qidToId.get(qid)).filter((value): value is string => Boolean(value))).filter((target) => target !== id);
    const relationEvidence = (property: string, relationName: string) => unique(claimIds(entity || {}, property)).map((qid) => ({ id: qidToId.get(qid) || qid.toLowerCase(), qid, property: relationName })).filter((item) => item.id !== id);
    const enTitle = entity?.sitelinks?.enwiki?.title || match?.pageTitle || seed.title; const trTitle = entity?.sitelinks?.trwiki?.title || null;
    return { id, qid: match?.qid || null, name: { en: term(entity || {}, "labels", "en", seed.label), tr: term(entity || {}, "labels", "tr", term(entity || {}, "labels", "en", seed.label)) }, aliases: { en: aliases(entity || {}, "en"), tr: aliases(entity || {}, "tr") }, description: { en: term(entity || {}, "descriptions", "en"), tr: term(entity || {}, "descriptions", "tr", term(entity || {}, "descriptions", "en")) }, sectionPath: seed.sectionPath, types: unique(claimIds(entity || {}, "P31")), parents: relation("P279"), related: relation("P361"), opposes: unique(OPPOSITIONS[id] || []).filter((target) => target !== id && qidToId.has([...qidToId.entries()].find(([, candidate]) => candidate === target)?.[0] || "")), relationEvidence: { parents: relationEvidence("P279", "P279"), related: relationEvidence("P361", "P361"), opposes: (OPPOSITIONS[id] || []).map((target) => ({ id: target, qid: [...qidToId.entries()].find(([, candidate]) => candidate === target)?.[0] || null, property: "manual-opposition" })) }, wikipedia: { en: wikiUrl(enTitle), tr: trTitle ? wikiUrl(trTitle, "tr") : null }, sources: { wikipedia: wikiUrl(enTitle), wikidata: match?.qid || null, match: { method: match?.method || "unmatched", confidence: match?.confidence || 0 } } };
  });
  const deduped = [...records.reduce((map, record) => { const existing = map.get(record.id); if (!existing || (existing.qid === null && record.qid)) map.set(record.id, record); else conflicts.push({ id: record.id, reason: "duplicate canonical ideology", kept: existing.qid, discarded: record.qid }); return map; }, new Map<string, Ideology>()).values()].sort((a, b) => a.id.localeCompare(b.id));
  removeParentCycles(deduped, conflicts);
  const dataset: Dataset = { metadata: { generatedAt: new Date().toISOString(), total: deduped.length, withWikidata: deduped.filter((item) => item.qid).length, withoutWikidata: deduped.filter((item) => !item.qid).length, sources: ["https://en.wikipedia.org/wiki/List_of_political_ideologies", "https://www.wikidata.org/w/api.php"] }, ideologies: deduped };
  const errors = validateDataset(dataset); if (errors.length) throw new Error(`dataset validation failed:\n${errors.join("\n")}`);
  await Promise.all([atomicWrite(join(DATA, "ideologies.json"), dataset), atomicWrite(join(DATA, "ideologies.min.json"), dataset, false), atomicWrite(join(DEBUG, "unmatched.json"), unmatched), atomicWrite(join(DEBUG, "duplicates.json"), conflicts.filter((item) => item.reason.includes("duplicate"))), atomicWrite(join(DEBUG, "conflicts.json"), conflicts)]);
  return { dataset, unmatched, conflicts };
}

if (import.meta.main) buildDataset().then(({ dataset, unmatched, conflicts }) => console.log(`ideologies: ${dataset.metadata.total}; Wikidata: ${dataset.metadata.withWikidata}; unmatched: ${unmatched.length}; conflicts: ${conflicts.length}`)).catch((error) => { console.error(error); process.exitCode = 1; });
