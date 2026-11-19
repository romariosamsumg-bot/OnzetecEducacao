import { describe, expect, it } from "vitest";
import { isSafeUrl, parseBrasiliaDateTime, parseMaterials, parsePriceToCents, slugify, toBrasiliaInput } from "@/lib/admin/util";

describe("utilidades do painel", () => {
  it("gera endereços amigáveis", () => {
    expect(slugify("Meu WhatsApp não toca!")).toBe("meu-whatsapp-nao-toca");
    expect(slugify("  --Ação & Reação--  ")).toBe("acao-reacao");
  });
  it("converte preços digitados em reais para centavos", () => {
    expect(parsePriceToCents("29,90")).toBe(2990);
    expect(parsePriceToCents("R$ 1.299,00")).toBe(129900);
    expect(parsePriceToCents("19.9")).toBe(1990);
    expect(parsePriceToCents("0")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
  });
  it("interpreta datas no horário de Brasília (UTC-3)", () => {
    expect(parseBrasiliaDateTime("2026-11-20T09:00")?.toISOString()).toBe("2026-11-20T12:00:00.000Z");
    expect(parseBrasiliaDateTime("")).toBeNull();
    expect(toBrasiliaInput("2026-11-20T12:00:00.000Z")).toBe("2026-11-20T09:00");
  });
  it("aceita somente links http(s) ou internos", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("//evil.com/x")).toBe(false);
    expect(isSafeUrl("/cursos/x")).toBe(true);
    expect(parseMaterials("Apostila | https://ex.com/a.pdf\nRuim | javascript:alert(1)")).toEqual([{ label: "Apostila", url: "https://ex.com/a.pdf" }]);
  });
});
