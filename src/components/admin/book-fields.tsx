import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/form";
import { CoverField } from "./forms";

export type BookValues = {
  id: string | null; title: string; slug: string; author: string; synopsis: string; toc: string[]; format: string;
  pages: number | null; price: string; status: string; publishedAtInput: string; includedInSubscription: boolean;
  coverImageUrl: string | null; sampleUrl: string; hasFile: boolean; storagePath: string;
};

export function BookFields({ v }: { v: BookValues }) {
  return (
    <>
      <input type="hidden" name="id" value={v.id ?? ""} />
      <TextField label="Título" name="title" defaultValue={v.title} required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Autor" name="author" defaultValue={v.author} required />
        <TextField label="Endereço (slug)" name="slug" defaultValue={v.slug} optional />
      </div>
      <TextArea label="Sinopse" name="synopsis" defaultValue={v.synopsis} rows={5} />
      <TextArea label="Sumário (um capítulo por linha)" name="toc" defaultValue={v.toc.join("\n")} rows={4} optional />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField label="Formato" name="format" defaultValue={v.format}>
          <option value="pdf">PDF</option>
          <option value="epub">EPUB</option>
        </SelectField>
        <TextField label="Páginas" name="pages" type="number" min={1} defaultValue={v.pages ?? ""} optional />
        <TextField label="Preço (R$)" name="price" inputMode="decimal" defaultValue={v.price} optional hint="Ex.: 29,90. Em branco = não está à venda." />
      </div>
      <Checkbox name="includedInSubscription" defaultChecked={v.includedInSubscription} label="Incluído na assinatura" hint="Assinantes ativos podem baixar sem pagar. Compradores mantêm o acesso mesmo sem assinatura." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Situação" name="status" defaultValue={v.status}>
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
          <option value="archived">Arquivado</option>
        </SelectField>
        <TextField label="Data de publicação (Brasília)" name="publishedAt" type="datetime-local" defaultValue={v.publishedAtInput} optional />
      </div>
      <CoverField name="coverImageUrl" initial={v.coverImageUrl} folder="books" label="Capa do livro" />
      <TextField label="Amostra grátis (endereço de um PDF público)" name="sampleUrl" defaultValue={v.sampleUrl} optional />
      <div className="space-y-1">
        <label htmlFor={`arquivo-${v.id ?? "novo"}`} className="block font-semibold text-navy-900">Arquivo do livro (PDF ou EPUB)</label>
        <p className="text-[0.9rem] text-ink-muted">{v.hasFile ? "Já existe um arquivo. Envie outro apenas para substituir." : "Ainda não há arquivo."} Guardado em área privada; só quem tem direito recebe um link temporário.</p>
        <input id={`arquivo-${v.id ?? "novo"}`} name="file" type="file" accept="application/pdf,application/epub+zip" className="block min-h-12 w-full rounded-[var(--radius-control)] border-2 border-dashed border-line bg-white p-2" />
        <p className="text-[0.9rem] text-ink-muted">Até cerca de 5 MB por aqui. Arquivos maiores: envie no painel do Supabase (bucket privado) e informe o caminho abaixo.</p>
      </div>
      <TextField
        label="Ou: caminho do arquivo já enviado ao armazenamento privado"
        name="storagePath"
        optional
        defaultValue={v.storagePath}
        placeholder="books/guia-do-whatsapp.pdf"
        hint="Use somente se enviou o arquivo direto pelo painel do Supabase."
      />
    </>
  );
}
