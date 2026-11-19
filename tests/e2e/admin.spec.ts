import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Fluxo administrativo", () => {
  test("cria curso, módulo e aula publicada, visível na plataforma", async ({ page, browser }) => {
    const stamp = Date.now();
    const course = `Curso E2E ${stamp}`;
    const lesson = `Aula E2E ${stamp}`;
    await login(page, "admin@onzetec.local", "/admin");

    await page.goto("/admin/cursos/novo");
    await page.getByLabel("Título do curso").fill(course);
    await page.getByLabel("Resumo (uma ou duas frases)").fill("Curso criado pelo teste automatizado.");
    await page.getByRole("combobox", { name: "Situação", exact: true }).selectOption("published");
    await page.getByRole("button", { name: "Salvar curso" }).click();
    await expect(page.getByText("Curso salvo.")).toBeVisible();

    await page.getByLabel("Novo módulo").fill("Primeiro módulo");
    await page.getByRole("button", { name: "Adicionar módulo" }).click();
    await expect(page.getByText("Módulo 1", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Nova aula neste módulo" }).click();

    await page.getByRole("textbox", { name: "Título", exact: true }).fill(lesson);
    await page.getByRole("textbox", { name: "Resumo público" }).fill("Aula criada pelo teste.");
    await page.getByRole("combobox", { name: "Onde está o vídeo" }).selectOption("file");
    await page.getByRole("textbox", { name: "Caminho do arquivo" }).fill("/demo/media/aula-demo.mp4");
    await page.getByRole("combobox", { name: "Quem pode ver o conteúdo completo" }).selectOption("free");
    await page.getByRole("combobox", { name: "Situação", exact: true }).selectOption("published");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Alterações salvas.")).toBeVisible();

    // Visitante (sem login) vê o curso e reproduz a aula gratuita
    const guest = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const g = await guest.newPage();
    await g.goto("/aprender");
    await g.getByRole("link", { name: course }).click();
    await g.getByRole("link", { name: new RegExp(lesson) }).click();
    await expect(g.getByRole("heading", { level: 1 })).toHaveText(lesson);
    await expect(g.locator("video")).toHaveCount(1);
    await guest.close();
  });

  test("define preço do plano e responde comentário como professor", async ({ page }) => {
    await login(page, "admin@onzetec.local", "/admin");
    await page.goto("/admin/planos");
    const form = page.locator("form").filter({ hasText: "Preço (R$ por mês)" });
    await form.getByLabel("Preço (R$ por mês)").fill("19,90");
    await form.getByRole("checkbox", { name: "Disponível para venda" }).check();
    await form.getByRole("button", { name: "Salvar plano" }).click();
    await expect(page.getByText(/Plano salvo/)).toBeVisible();
    await page.goto("/assinatura");
    await expect(page.getByText("Você é administrador e tem acesso completo.")).toBeVisible();
    // Restaura: plano fora de venda (outros testes verificam a ausência de preços)
    await page.goto("/admin/planos");
    await form.getByRole("checkbox", { name: "Disponível para venda" }).uncheck();
    await form.getByRole("button", { name: "Salvar plano" }).click();
    await expect(page.getByText(/Plano salvo/)).toBeVisible();

    await page.goto("/admin/comentarios");
    const reply = page.getByLabel("Responder como professor").first();
    if (await reply.count()) {
      await reply.fill("Obrigado pela pergunta! Resposta do professor.");
      await page.getByRole("button", { name: "Enviar resposta oficial" }).first().click();
      await page.waitForLoadState("networkidle");
    }
  });
});
