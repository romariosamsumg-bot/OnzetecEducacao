import { expect, test } from "@playwright/test";
import { noHorizontalScroll } from "./helpers";

test.describe("Fluxo do visitante", () => {
  test("entende a proposta e encontra conteúdo público", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Use o seu celular com confiança");
    await expect(page.getByRole("link", { name: "Conhecer a assinatura" })).toBeVisible();
    await noHorizontalScroll(page);
    await page.getByRole("navigation", { name: "Navegação principal" }).last().getByRole("link", { name: "Aprender" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("O que você quer aprender?");
    await page.getByRole("link", { name: /WhatsApp Mensagens/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("WhatsApp");
    await page.getByRole("link", { name: "WhatsApp sem complicação" }).click();
    await expect(page.getByRole("heading", { name: "Conteúdo do curso" })).toBeVisible();
    await expect(page.getByRole("link", { name: /1\. Enviar mensagem e áudio/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Começar o curso" })).toBeVisible();
  });

  test("páginas públicas não exibem a tela de erro", async ({ page }) => {
    for (const path of ["/", "/aprender", "/aprender/seguranca", "/cursos/primeiros-passos-no-android", "/aulas/ligar-desligar-e-reiniciar", "/resolver/celular-lento", "/dicas", "/dicas/tirar-print-da-tela", "/artigos/como-reconhecer-um-link-falso", "/livraria", "/livraria/guia-de-bolso-do-whatsapp", "/assinatura", "/ajuda", "/termos", "/privacidade"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
      await expect(page.getByText("Algo não funcionou como deveria"), path).toHaveCount(0);
    }
  });

  test("busca um problema com linguagem do dia a dia", async ({ page }) => {
    await page.goto("/resolver");
    await page.getByRole("searchbox", { name: "Descreva o problema" }).fill("meu zap tá mudo");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("status").first()).toContainText("Encontramos");
    await page.getByRole("link", { name: "Meu WhatsApp não toca quando chega mensagem" }).click();
    await expect(page.getByRole("heading", { name: "Passo a passo" })).toBeVisible();
    await expect(page.getByText("Passo 1:", { exact: false })).toBeAttached();
    await expect(page.getByRole("heading", { name: "Esta solução funcionou?" })).toBeVisible();
  });

  test("conhece a assinatura sem preços inventados e inicia o cadastro", async ({ page }) => {
    await page.goto("/assinatura");
    await expect(page.getByText("Os planos de assinatura serão lançados em breve")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cancelamento" })).toBeVisible();
    await page.goto("/cadastro");
    await page.getByLabel("Como você gostaria de ser chamado(a)?").fill("Lúcia");
    await page.getByLabel("E-mail").fill(`lucia.${Date.now()}@teste.local`);
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByText("Para criar a conta, é preciso aceitar")).toBeVisible();
    await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Olá, Lúcia");
    await expect(page.getByText("O que você gostaria de aprender primeiro?")).toBeVisible();
    await page.getByRole("button", { name: "Agora não" }).click();
    await expect(page.getByText("O que você gostaria de aprender primeiro?")).toHaveCount(0);
  });
});
