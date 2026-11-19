import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Fluxo do assinante", () => {
  test("assiste, continua de onde parou, salva e comenta", async ({ page }) => {
    await login(page, "assinante@onzetec.local");
    await page.goto("/cursos/whatsapp-sem-complicacao");
    await page.getByRole("link", { name: /Enviar fotos e vídeos/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Enviar fotos e vídeos");

    const video = page.locator("video");
    await expect(video).toHaveAttribute("preload", "metadata");
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true); // sem reprodução automática
    await expect(video.locator("track[kind=captions]")).toHaveCount(1);

    await page.getByRole("group", { name: "Controles do vídeo" }).getByRole("button", { name: "Assistir" }).click();
    await page.waitForFunction(() => (document.querySelector("video") as HTMLVideoElement).currentTime > 1);
    await page.getByRole("group", { name: "Controles do vídeo" }).getByRole("button", { name: "Avançar 10 s" }).click();
    await page.getByRole("group", { name: "Controles do vídeo" }).getByRole("button", { name: "Pausar" }).click();
    await page.waitForTimeout(1500); // gravação do progresso ao pausar

    await page.reload();
    await expect(page.getByText("Continuando de onde você parou")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Salvo em Meus salvos.")).toBeVisible();

    // Sem números longos: o filtro antigolpe retém sequências que parecem cartão/CPF.
    const text = `Consegui enviar a foto! Obrigada ${Math.random().toString(36).replace(/[0-9.]/g, "").slice(0, 6)}`;
    await page.getByLabel("Escreva um comentário ou dúvida").fill(text);
    await page.getByRole("button", { name: "Publicar comentário" }).click();
    await expect(page.getByText("Comentário publicado.")).toBeVisible();
    await expect(page.getByText(text)).toBeVisible();

    await page.goto("/salvos");
    await expect(page.getByRole("link", { name: "Enviar fotos e vídeos" }).first()).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Continuar de onde parei" })).toBeVisible();
  });

  test("comentário com link fica aguardando revisão", async ({ page }) => {
    await login(page, "assinante@onzetec.local");
    await page.goto("/aulas/ligar-desligar-e-reiniciar");
    await page.getByLabel("Escreva um comentário ou dúvida").fill("Achei isso em www.exemplo-qualquer.com");
    await page.getByRole("button", { name: "Publicar comentário" }).click();
    await expect(page.getByText(/será revisado antes de aparecer/)).toBeVisible();
  });

  test("vê a situação da assinatura em linguagem clara", async ({ page }) => {
    await login(page, "assinante@onzetec.local");
    await page.goto("/conta");
    await expect(page.getByText("Acesso de cortesia ativo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Baixar meus dados" })).toBeVisible();
  });
});
