import "server-only";
import { json, type Db } from "@/lib/db";

/** Registro administrativo essencial (quem fez o quê, quando). Sem dados sensíveis. */
export async function audit(db: Db, action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await db`insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), ${action}, ${entityType}, ${entityId}, ${json(details)})`;
}
