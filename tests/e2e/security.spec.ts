import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Fluxo de segurança", () => {
  test("visitante não acessa aula paga por URL", async ({ page }) => {
    const res = await page.goto("/aulas/botoes-e-gestos-da-tela");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /exclusivo para assinantes/ })).toBeVisible();
    await expect(page.locator("video")).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain("aula-demo.mp4");
    expect(html).not.toContain("Vamos conhecer os toques e gestos da tela");
  });

  test("visitante não baixa livro por chamada direta", async ({ request }) => {
    const r = await request.get("/api/livros/seguranca-digital-para-a-familia/download", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers()["location"]).toContain("/entrar");
    const exp = await request.get("/api/conta/exportar");
    expect(exp.status()).toBe(401);
  });

  test("conta gratuita não acessa conteúdo pago nem o painel", async ({ page }) => {
    await login(page, "visitante@onzetec.local");
    await page.goto("/resolver/celular-lento");
    await expect(page.getByRole("heading", { name: /exclusivo para assinantes/ })).toBeVisible();
    expect(await page.content()).not.toContain("Reinicie o celular: segure o botão");
    // Com pré-renderização parcial o 404 chega por streaming (status HTTP 200);
    // o que importa: nenhuma informação ou navegação do painel é exibida.
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Não encontramos esta página" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Painel administrativo" })).toHaveCount(0);
    expect(await page.content()).not.toContain("Assinantes ativos");
  });

  test("webhook sem assinatura válida é recusado", async ({ request }) => {
    const r = await request.post("/api/webhooks/mercadopago?data.id=1&type=payment", { data: { type: "payment", data: { id: "1" } } });
    expect(r.ok()).toBe(false);
  });

  test("cookie de sessão adulterado não autentica", async ({ page, context }) => {
    await context.addCookies([{ name: "oz_dev_session", value: "eyJ1aWQiOiJ4In0.assinatura-falsa", url: "http://localhost:3100" }]);
    await page.goto("/conta");
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("cabeçalhos de segurança presentes", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toBeTruthy();
  });
});
