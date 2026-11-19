/**
 * Normalização da busca "Resolver": aceita a linguagem do dia a dia.
 * Funções puras (testadas em tests/unit/search.test.ts).
 */

export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Palavras que não ajudam a encontrar a solução. */
const FILLER = new Set([
  "meu", "minha", "meus", "minhas", "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das",
  "e", "que", "com", "como", "para", "pra", "no", "na", "nos", "nas", "por", "eu", "ele", "ela", "esta",
  "ta", "to", "estou", "consigo", "nao", "sei", "fazer", "faco", "quero", "preciso", "ajuda", "celular",
]);

export function tokenize(normalized: string): string[] {
  return normalized
    .split(" ")
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length >= 2 && !FILLER.has(t));
}

/**
 * Expande cada palavra com sinônimos/termos populares.
 * Ex.: "zap mudo" -> ["zap", "whatsapp", "mudo", "som", "silencioso", "notificacao"]
 */
export function expandTerms(tokens: string[], synonyms: Map<string, string[]>): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    const variants = [t, t.replace(/-/g, ""), t.endsWith("s") ? t.slice(0, -1) : t];
    for (const v of variants) {
      for (const e of synonyms.get(v) ?? []) out.add(normalizeQuery(e));
    }
  }
  return [...out].filter(Boolean).slice(0, 24);
}

/** Monta uma tsquery segura (somente [a-z0-9], operadores controlados por nós). */
export function buildTsQuery(terms: string[]): string | null {
  const parts = terms
    .map((term) =>
      term
        .split(/[\s-]+/)
        .map((w) => w.replace(/[^a-z0-9]/g, ""))
        .filter((w) => w.length >= 2),
    )
    .filter((words) => words.length > 0)
    .map((words) => (words.length === 1 ? `${words[0]}:*` : `(${words.join(" & ")})`));
  return parts.length ? parts.join(" | ") : null;
}
