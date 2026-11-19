import { SelectField, TextArea, TextField } from "@/components/ui/form";
import { CoverField } from "./forms";

export type CourseValues = {
  id: string | null; title: string; slug: string; summary: string; description: string; categoryId: string | null;
  status: string; publishedAtInput: string; level: string; appName: string; osName: string; versionRange: string;
  lastReviewedAt: string; editorialStatus: string; coverImageUrl: string | null;
};

export function CourseFields({ v, categories }: { v: CourseValues; categories: { id: string; name: string }[] }) {
  return (
    <>
      <input type="hidden" name="id" value={v.id ?? ""} />
      <TextField label="Título do curso" name="title" defaultValue={v.title} required />
      <TextField label="Endereço (slug)" name="slug" defaultValue={v.slug} hint="Deixe em branco para gerar a partir do título." />
      <TextArea label="Resumo (uma ou duas frases)" name="summary" defaultValue={v.summary} rows={2} maxLength={400} />
      <TextArea label="Descrição" name="description" defaultValue={v.description} rows={5} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField label="Categoria" name="categoryId" defaultValue={v.categoryId ?? ""}>
          <option value="">Sem categoria</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Nível" name="level" defaultValue={v.level}>
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
        </SelectField>
        <SelectField label="Situação" name="status" defaultValue={v.status}>
          <option value="draft">Rascunho</option>
          <option value="scheduled">Agendado</option>
          <option value="published">Publicado</option>
          <option value="archived">Arquivado</option>
        </SelectField>
      </div>
      <TextField label="Data de publicação (horário de Brasília)" name="publishedAt" type="datetime-local" defaultValue={v.publishedAtInput} optional hint="Obrigatória para agendar. Em branco ao publicar = agora." />
      <CoverField name="coverImageUrl" initial={v.coverImageUrl} folder="covers" label="Capa do curso" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField label="Aplicativo" name="appName" defaultValue={v.appName} optional />
        <TextField label="Sistema" name="osName" defaultValue={v.osName} optional />
        <TextField label="Versões" name="versionRange" defaultValue={v.versionRange} optional />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Última revisão" name="lastReviewedAt" type="date" defaultValue={v.lastReviewedAt} optional />
        <SelectField label="Situação editorial" name="editorialStatus" defaultValue={v.editorialStatus}>
          <option value="current">Atualizado</option>
          <option value="review_soon">Revisar em breve</option>
          <option value="outdated">Desatualizado</option>
        </SelectField>
      </div>
    </>
  );
}
