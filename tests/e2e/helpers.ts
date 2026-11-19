import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string, returnTo = "/") {
  await page.goto(`/entrar?voltar=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "a página não deve rolar na horizontal").toBeLessThanOrEqual(1);
}
