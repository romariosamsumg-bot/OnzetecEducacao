/** Utilidades do painel (funções puras, testadas em tests/unit/admin-util.test.ts). */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Linhas não vazias de um campo de texto (uma por linha). */
export function lines(value: FormDataEntryValue | null, max = 50): string[] {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

/**
 * "2026-11-20T09:00" (campo datetime-local) interpretado no horário de Brasília (UTC-3,
 * sem horário de verão desde 2019). Retorna null se vazio/ inválido.
 */
export function parseBrasiliaDateTime(value: FormDataEntryValue | null): Date | null {
  const v = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toBrasiliaInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const t = new Date(new Date(d).getTime() - 3 * 3600_000);
  return t.toISOString().slice(0, 16);
}

/** "Rótulo | https://..." -> { label, url } (somente http(s) ou caminho interno). */
export function parseMaterials(value: FormDataEntryValue | null): { label: string; url: string }[] {
  return lines(value, 20)
    .map((l) => {
      const [label, ...rest] = l.split("|");
      return { label: label.trim(), url: rest.join("|").trim() };
    })
    .filter((m) => m.label && isSafeUrl(m.url));
}

export function isSafeUrl(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Reais digitados ("29,90", "29.90", "R$ 29,90") -> centavos. */
export function parsePriceToCents(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(/[^\d,.]/g, "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) return null;
  return Math.round(n * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
