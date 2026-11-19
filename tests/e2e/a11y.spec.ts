import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login, noHorizontalScroll } from "./helpers";

const publicPages = ["/", "/aprender", "/resolver", "/resolver?q=celular+lento", "/resolver/whatsapp-nao-toca", "/cursos/primeiros-passos-no-android", "/aulas/ligar-desligar-e-reiniciar", "/dicas", "/livraria", "/livraria/guia-de-bolso-do-whatsapp", "/assinatura", "/entrar", "/cadastro", "/ajuda"];

async function axe(page: import("@playwright/test").Page) {
  const r = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test.describe("Acessibilidade", () => {
  for (const path of publicPages) {
    test(`sem violações WCAG AA detectáveis: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await axe(page)).toEqual([]);
      await noHorizontalScroll(page);
    });
  }

  test("páginas do assinante e do painel sem violações", async ({ page }) => {
    await login(page, "admin@onzetec.local");
    for (const path of ["/", "/salvos", "/conta", "/aulas/enviar-fotos-e-videos", "/admin", "/admin/conteudos/novo?tipo=guide"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await axe(page), path).toEqual([]);
    }
  });

  test("texto ampliado (130% + zoom 200%) sem perda de conteúdo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Tamanho do texto/ }).click();
    await page.getByRole("button", { name: "Muito grande" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-text-scale", "130");
    for (const path of ["/", "/resolver/whatsapp-nao-toca", "/assinatura", "/aulas/ligar-desligar-e-reiniciar"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-text-scale", "130");
      await noHorizontalScroll(page);
    }
    // Zoom 200%: equivalente a uma janela de 180px CSS de largura
    await page.setViewportSize({ width: 180, height: 400 });
    await page.goto("/resolver/whatsapp-nao-toca");
    await expect(page.getByRole("heading", { name: "Passo a passo" })).toBeVisible();
  });

  test("navegação por teclado: atalho para o conteúdo e foco visível", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
    await page.goto("/entrar");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("alvos de toque da navegação principal com pelo menos 44px", async ({ page }) => {
    await page.goto("/");
    const links = page.getByRole("navigation", { name: "Navegação principal" }).last().getByRole("link");
    for (const l of await links.all()) {
      const box = await l.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });
});
