import dataset from "../../data/ideologies.json";

export type IdeologyOption = { id: string; name: { en: string; tr: string }; aliases: { en: string[]; tr: string[] } };

const ideologies = dataset.ideologies as IdeologyOption[];
const normalize = (value: string) => value.trim().toLocaleLowerCase("tr-TR");
const lookup = new Map<string, string>(ideologies.flatMap((ideology) => [ideology.id, ideology.name.en, ideology.name.tr, ...ideology.aliases.en, ...ideology.aliases.tr].filter(Boolean).map((value) => [normalize(value), ideology.id] as const)));
lookup.set("antikemalist", "anti-kemalism");
lookup.set("seküler", "secularism");

export function ideologyOptions() { return ideologies.map(({ id, name }) => ({ id, name })); }
export function resolveIdeology(value: unknown): string | null {
  const candidate = String(value ?? "").trim();
  if (!candidate || candidate === "belirsiz") return "belirsiz";
  const id = lookup.get(normalize(candidate)) || null;
  return id && ideologies.some((ideology) => ideology.id === id) ? id : null;
}
export function ideologyLabel(value: unknown): string {
  const id = resolveIdeology(value); const item = id && id !== "belirsiz" ? ideologies.find((ideology) => ideology.id === id) : undefined;
  return item?.name.tr || item?.name.en || "belirsiz";
}
