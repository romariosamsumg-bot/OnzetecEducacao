"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldScopeProvider, SelectField, TextArea, TextField, type FormState } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/primitives";
import { saveContent } from "@/server/actions/admin/content";
import type { ArticleBlock, ContentType, GuideStep } from "@/lib/content/types";
import { contentTypeLabel } from "@/lib/content/types";
import { BlocksEditor, ImageUploader, StepsEditor, StreamUploader } from "./editors";

export type ContentFormData = {
  id: string | null;
  type: ContentType;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
  categoryId: string | null;
  courseId: string | null;
  moduleId: string | null;
  position: number;
  access: "free" | "premium";
  status: "draft" | "scheduled" | "published" | "archived";
  publishedAtInput: string;
  commentsEnabled: boolean;
  durationSeconds: number | null;
  level: string;
  appName: string;
  osName: string;
  versionRange: string;
  lastReviewedAt: string;
  editorialStatus: string;
  searchPhrases: string[];
  tags: string[];
  transcript: string;
  materials: { label: string; url: string }[];
  blocks: ArticleBlock[];
  guide: { causes: string[]; steps: GuideStep[]; cautions: string[]; if_not_working: string } | null;
  video: { provider: string; providerAssetId: string; posterUrl: string | null; captionUrl: string } | null;
};

type Option = { id: string; name: string };

const fieldLabels: Record<string, string> = {
  title: "Título", slug: "Endereço", summary: "Resumo", categoryId: "Categoria", courseId: "Curso", moduleId: "Módulo",
  position: "Ordem", access: "Acesso", status: "Situação", durationSeconds: "Duração", level: "Nível", appName: "Aplicativo",
  osName: "Sistema", versionRange: "Versões", lastReviewedAt: "Última revisão", editorialStatus: "Situação editorial",
  publishedAt: "Data de publicação", coverImageUrl: "Capa",
};
type CourseOption = { id: string; title: string; modules: { id: string; title: string }[] };

export function ContentForm({ data, categories, courses }: { data: ContentFormData; categories: Option[]; courses: CourseOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContent, {});
  const [cover, setCover] = useState<string | null>(data.coverImageUrl);
  const [courseId, setCourseId] = useState(data.courseId ?? "");
  const [status, setStatus] = useState(data.status);
  const [access, setAccess] = useState(data.access);
  const [videoProvider, setVideoProvider] = useState(data.video?.provider ?? (data.type === "video" || data.type === "short" ? "cloudflare_stream" : ""));
  const [videoId, setVideoId] = useState(data.video?.providerAssetId ?? "");
  const modules = courses.find((c) => c.id === courseId)?.modules ?? [];
  const e = state.errors ?? {};
  const isVideo = data.type === "video" || data.type === "short";

  return (
    <FieldScopeProvider scope={`conteudo-${data.type}-${data.id ?? "novo"}`}>
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="id" value={data.id ?? ""} />
      <input type="hidden" name="type" value={data.type} />
      <input type="hidden" name="coverImageUrl" value={cover ?? ""} />
      {state.message ? <Alert tone={state.ok ? "success" : "error"} live>{state.message}</Alert> : null}
      {Object.keys(e).length > 0 ? (
        <Alert tone="error" title="Corrija os campos abaixo">
          <ul className="list-disc pl-5">
            {Object.entries(e).map(([k, v]) => (v?.length ? <li key={k}><strong>{fieldLabels[k] ?? k}:</strong> {v[0]}</li> : null))}
          </ul>
        </Alert>
      ) : null}

      <Card className="space-y-5 p-5">
        <h2 className="text-[1.2rem] font-bold text-navy-900">{contentTypeLabel[data.type]}: informações principais</h2>
        <TextField label="Título" name="title" defaultValue={data.title} required error={e.title} />
        <TextField label="Endereço (slug)" name="slug" defaultValue={data.slug} hint="Deixe em branco para gerar a partir do título. Ex.: whatsapp-nao-toca" error={e.slug} />
        <TextArea label="Resumo público" name="summary" defaultValue={data.summary} rows={3} maxLength={600} hint="Aparece para todos e nos buscadores, mesmo em conteúdo pago." error={e.summary} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Categoria" name="categoryId" defaultValue={data.categoryId ?? ""} error={e.categoryId}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <SelectField label="Nível" name="level" defaultValue={data.level}>
            <option value="iniciante">Iniciante</option>
            <option value="intermediario">Intermediário</option>
          </SelectField>
        </div>
        <ImageUploader folder="covers" label="Capa / miniatura" value={cover} onChange={setCover} />
      </Card>

      {data.type === "video" ? (
        <Card className="space-y-5 p-5">
          <h2 className="text-[1.2rem] font-bold text-navy-900">Curso e módulo</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField label="Curso" name="courseId" value={courseId} onChange={(ev) => setCourseId(ev.target.value)}>
              <option value="">Aula avulsa (sem curso)</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </SelectField>
            <SelectField label="Módulo" name="moduleId" defaultValue={data.moduleId ?? ""} disabled={!courseId} error={e.moduleId}>
              <option value="">{courseId ? "Escolha o módulo" : "—"}</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </SelectField>
            <TextField label="Ordem no módulo" name="position" type="number" min={0} defaultValue={data.position} />
          </div>
        </Card>
      ) : null}

      {isVideo ? (
        <Card className="space-y-5 p-5">
          <h2 className="text-[1.2rem] font-bold text-navy-900">Vídeo</h2>
          <SelectField label="Onde está o vídeo" name="videoProvider" value={videoProvider} onChange={(ev) => setVideoProvider(ev.target.value)}>
            <option value="">Sem vídeo</option>
            <option value="cloudflare_stream">Cloudflare Stream (recomendado)</option>
            <option value="file">Arquivo de demonstração (/demo/…)</option>
          </SelectField>
          {videoProvider === "cloudflare_stream" ? (
            <StreamUploader premium={access === "premium"} onUploaded={(uid) => setVideoId(uid)} />
          ) : null}
          {videoProvider ? (
            <TextField
              label={videoProvider === "cloudflare_stream" ? "Identificador do vídeo no Stream (UID)" : "Caminho do arquivo"}
              name="videoAssetId"
              value={videoId}
              onChange={(ev) => setVideoId(ev.target.value)}
              hint={videoProvider === "cloudflare_stream" ? "Preenchido automaticamente após o envio, ou cole o UID do painel do Cloudflare." : "Somente para demonstração."}
            />
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Duração em segundos" name="durationSeconds" type="number" min={0} defaultValue={data.durationSeconds ?? ""} optional hint="Preenchida automaticamente pelo Stream quando possível." />
            <TextField label="Miniatura do vídeo (URL)" name="posterUrl" defaultValue={data.video?.posterUrl ?? ""} optional />
          </div>
          <TextField label="Legendas (URL de arquivo .vtt)" name="captionUrl" defaultValue={data.video?.captionUrl ?? ""} optional hint="No Stream, as legendas podem ser adicionadas no próprio Cloudflare." />
          <TextArea label="Transcrição" name="transcript" defaultValue={data.transcript} rows={6} optional />
        </Card>
      ) : null}

      {data.type === "guide" ? (
        <Card className="space-y-5 p-5">
          <h2 className="text-[1.2rem] font-bold text-navy-900">Guia de solução</h2>
          <TextArea label="Possíveis causas (uma por linha)" name="causes" defaultValue={data.guide?.causes.join("\n") ?? ""} rows={4} hint="Escreva como possibilidades, sem afirmar um diagnóstico." />
          <StepsEditor initial={data.guide?.steps ?? []} />
          <TextArea label="Cuidados importantes (um por linha)" name="cautions" defaultValue={data.guide?.cautions.join("\n") ?? ""} rows={3} />
          <TextArea label="O que fazer se não funcionar" name="ifNotWorking" defaultValue={data.guide?.if_not_working ?? ""} rows={3} />
        </Card>
      ) : null}

      {data.type === "article" ? (
        <Card className="p-5">
          <BlocksEditor initial={data.blocks} />
        </Card>
      ) : null}

      <Card className="space-y-5 p-5">
        <h2 className="text-[1.2rem] font-bold text-navy-900">Busca e relacionados</h2>
        <TextArea
          label="Como as pessoas descrevem este assunto (uma frase por linha)"
          name="searchPhrases"
          defaultValue={data.searchPhrases.join("\n")}
          rows={4}
          hint='Ex.: "zap sem som", "whatsapp mudo". Ajuda a busca Resolver a encontrar este conteúdo.'
        />
        <TextField label="Tags (separadas por vírgula)" name="tags" defaultValue={data.tags.join(", ")} optional />
        <TextArea label="Materiais complementares (Rótulo | endereço, um por linha)" name="materials" defaultValue={data.materials.map((m) => `${m.label} | ${m.url}`).join("\n")} rows={3} optional />
      </Card>

      <Card className="space-y-5 p-5">
        <h2 className="text-[1.2rem] font-bold text-navy-900">Revisão editorial</h2>
        <p className="text-[0.95rem] text-ink-muted">Aplicativos mudam. Registre o contexto para saber quando revisar. Não informe versões sem confirmar.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="Aplicativo" name="appName" defaultValue={data.appName} optional />
          <TextField label="Sistema" name="osName" defaultValue={data.osName} optional />
          <TextField label="Versões (se relevante)" name="versionRange" defaultValue={data.versionRange} optional />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Data da última revisão" name="lastReviewedAt" type="date" defaultValue={data.lastReviewedAt} optional />
          <SelectField label="Situação editorial" name="editorialStatus" defaultValue={data.editorialStatus}>
            <option value="current">Atualizado</option>
            <option value="review_soon">Revisar em breve</option>
            <option value="outdated">Desatualizado</option>
          </SelectField>
        </div>
      </Card>

      <Card className="space-y-5 p-5">
        <h2 className="text-[1.2rem] font-bold text-navy-900">Publicação e acesso</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Quem pode ver o conteúdo completo" name="access" value={access} onChange={(ev) => setAccess(ev.target.value as "free" | "premium")}>
            <option value="free">Todos (gratuito)</option>
            <option value="premium">Somente assinantes</option>
          </SelectField>
          <SelectField label="Situação" name="status" value={status} onChange={(ev) => setStatus(ev.target.value as ContentFormData["status"])}>
            <option value="draft">Rascunho</option>
            <option value="scheduled">Agendado</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </SelectField>
        </div>
        {status === "scheduled" || status === "published" ? (
          <TextField
            label={status === "scheduled" ? "Publicar em (horário de Brasília)" : "Data de publicação (horário de Brasília)"}
            name="publishedAt"
            type="datetime-local"
            defaultValue={data.publishedAtInput}
            error={e.publishedAt}
            hint={status === "published" ? "Deixe em branco para publicar agora." : undefined}
          />
        ) : null}
        <Checkbox name="commentsEnabled" defaultChecked={data.commentsEnabled} label="Permitir comentários" />
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap gap-3 border-t border-line bg-[#f3f5f8]/95 px-1 py-4">
        <Button type="submit" size="lg" loading={pending}>Salvar</Button>
      </div>
    </form>
    </FieldScopeProvider>
  );
}
