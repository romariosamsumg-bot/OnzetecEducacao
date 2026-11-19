import { describe, expect, it } from "vitest";
import { buildTsQuery, expandTerms, normalizeQuery, tokenize } from "@/lib/search/normalize";

const syn = new Map<string, string[]>([
  ["zap", ["whatsapp"]],
  ["mudo", ["som", "silencioso", "notificacao"]],
  ["espaco", ["armazenamento", "memoria"]],
  ["letras", ["fonte", "tamanho"]],
]);

describe("busca Resolver", () => {
  it("normaliza acentos, maiúsculas e pontuação", () => {
    expect(normalizeQuery("  Meu ZAP está MUDO!!! ")).toBe("meu zap esta mudo");
    expect(normalizeQuery("Celular sem espaço?")).toBe("celular sem espaco");
  });

  it("remove palavras sem valor para a busca", () => {
    expect(tokenize("meu celular nao consigo mandar foto")).toEqual(["mandar", "foto"]);
  });

  it("expande sinônimos e termos populares", () => {
    const terms = expandTerms(tokenize(normalizeQuery("meu zap está mudo")), syn);
    expect(terms).toContain("whatsapp");
    expect(terms).toContain("som");
    expect(terms).toContain("zap");
  });

  it("expande plural para o singular cadastrado", () => {
    expect(expandTerms(["letras"], syn)).toContain("fonte");
  });

  it("gera tsquery segura (sem operadores vindos do usuário)", () => {
    expect(buildTsQuery(["whatsapp", "sem som"])).toBe("whatsapp:* | (sem & som)");
    expect(buildTsQuery(["a"])).toBeNull();
    const q = buildTsQuery(normalizeQuery("x' | !(drop):* & <->").split(" "));
    expect(q ?? "").toMatch(/^[a-z0-9:*|&() ]*$/);
  });
});
