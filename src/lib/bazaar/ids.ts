/** Hypixel product ids are the canonical key. Case is normalized; punctuation is kept. */
export function canonicalItemId(id: string): string {
  return id.trim().toUpperCase();
}

/** Last-resort label when neither Hypixel nor Coflnet has a display name. */
export function derivedName(id: string): string {
  const enchant = id.startsWith("ENCHANTMENT_");
  const shard = id.startsWith("SHARD_");
  const essence = id.startsWith("ESSENCE_");
  let core = id;
  if (enchant) core = id.slice("ENCHANTMENT_".length);
  else if (shard) core = id.slice("SHARD_".length);
  else if (essence) core = id.slice("ESSENCE_".length);
  const words = core
    .split("_")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });
  let name = words.join(" ") || id;
  if (enchant) name += " Enchant";
  else if (shard) name += " Shard";
  else if (essence) name += " Essence";
  return name;
}

export function categoryFromId(id: string): string | null {
  if (id.startsWith("ENCHANTMENT_")) return "ENCHANTMENT";
  if (id.startsWith("SHARD_")) return "SHARD";
  if (id.startsWith("ESSENCE_")) return "ESSENCE";
  return null;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
