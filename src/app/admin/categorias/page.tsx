import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/forms";
import { Checkbox, SelectField, TextField } from "@/components/ui/form";
import { CategoryIcon, categoryIcons } from "@/components/ui/icon";
import { Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { saveCategory } from "@/server/actions/admin/catalog";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Categorias" };

type Cat = { id: string; slug: string; name: string; description: string; icon: string; sortOrder: number; isActive: boolean };

function Fields({ c }: { c?: Cat }) {
  return (
    <>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Nome" name="name" id={`n-${c?.id ?? "new"}`} defaultValue={c?.name} required />
        <TextField label="Endereço (slug)" name="slug" id={`s-${c?.id ?? "new"}`} defaultValue={c?.slug} optional />
      </div>
      <TextField label="Descrição curta" name="description" id={`d-${c?.id ?? "new"}`} defaultValue={c?.description} optional />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectField label="Ícone" name="icon" id={`i-${c?.id ?? "new"}`} defaultValue={c?.icon ?? "book-open"}>
          {Object.keys(categoryIcons).map((k) => <option key={k} value={k}>{k}</option>)}
        </SelectField>
        <TextField label="Ordem" name="sortOrder" id={`o-${c?.id ?? "new"}`} type="number" min={0} defaultValue={c?.sortOrder ?? 0} />
        <Checkbox name="isActive" defaultChecked={c?.isActive ?? true} label="Visível" />
      </div>
    </>
  );
}

export default async function CategoriasAdmin() {
  const admin = await requireAdmin();
  const cats = await asUser(admin.id, (db) => db<Cat[]>`select id, slug, name, description, icon, sort_order, is_active from public.categories order by sort_order, name`);
  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" description="Novas categorias aparecem automaticamente em Aprender, sem mudar código." />
      <Card className="p-5">
        <h2 className="mb-3 text-[1.15rem] font-bold text-navy-900">Nova categoria</h2>
        <ActionForm scope="categoria-nova" action={saveCategory} submitLabel="Criar categoria"><Fields /></ActionForm>
      </Card>
      {cats.map((c) => (
        <details key={c.id} className="rounded-[var(--radius-card)] border border-line bg-white p-4">
          <summary className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-navy-900">
            <CategoryIcon name={c.icon} className="size-5 text-navy-700" /> {c.name} {!c.isActive ? <span className="text-ink-muted">(oculta)</span> : null}
          </summary>
          <div className="pt-4"><ActionForm scope={`categoria-${c.id}`} action={saveCategory}><Fields c={c} /></ActionForm></div>
        </details>
      ))}
    </div>
  );
}
