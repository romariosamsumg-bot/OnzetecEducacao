import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("db/supabase-setup.sql", () => {
  it("contém todas as migrações (rode `npm run db:setup-sql` após criar uma migração)", () => {
    const bundle = readFileSync("db/supabase-setup.sql", "utf8");
    for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql"))) {
      expect(bundle, f).toContain(`-- >>> ${f}`);
    }
    expect(bundle).not.toContain("@onzetec.local"); // sem contas de teste
  });
});
