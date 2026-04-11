import { createHash, randomBytes, randomUUID } from "node:crypto";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { admin } from "$lib/server/admin";
import { resolveOrganization } from "$lib/server/organizations";
import type { Json } from "$lib/types/supabase";

type StoredApiKey = {
  id: string;
  label: string;
  hash: string;
  preview: string;
  created_at: string;
};

type OrgMetadata = {
  api_keys?: StoredApiKey[];
  [key: string]: Json | undefined;
};

function parseMetadata(value: Json | null): OrgMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as OrgMetadata;
}

function buildPreview(key: string): string {
  return `${key.slice(0, 12)}••••${key.slice(-4)}`;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export const GET: RequestHandler = async ({ locals }) => {
  const organization = await resolveOrganization(locals.session?.userId);

  if (!organization) {
    return json({ keys: [] });
  }

  const metadata = parseMetadata(organization.metadata);
  const keys = (metadata.api_keys ?? []).map((key) => ({
    id: key.id,
    label: key.label,
    preview: key.preview,
    created_at: key.created_at,
  }));

  return json({ keys });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const organization = await resolveOrganization(locals.session?.userId);

  if (!organization) {
    return json({ error: "workspace_not_found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        label?: string;
      }
    | null;

  const label = body?.label?.trim() || "Server API key";
  const plaintext = `cp_live_${randomBytes(16).toString("hex")}`;
  const entry: StoredApiKey = {
    id: randomUUID(),
    label,
    hash: hashKey(plaintext),
    preview: buildPreview(plaintext),
    created_at: new Date().toISOString(),
  };

  const metadata = parseMetadata(organization.metadata);
  const { error } = await admin
    .from("organizations")
    .update({
      metadata: {
        ...metadata,
        api_keys: [entry, ...(metadata.api_keys ?? [])],
      } as Json,
    } as never)
    .eq("id", organization.id);

  if (error) {
    return json({ error: "create_failed" }, { status: 500 });
  }

  return json({
    key: plaintext,
    api_key: {
      id: entry.id,
      label: entry.label,
      preview: entry.preview,
      created_at: entry.created_at,
    },
  });
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
  const organization = await resolveOrganization(locals.session?.userId);
  const id = url.searchParams.get("id")?.trim();

  if (!organization) {
    return json({ error: "workspace_not_found" }, { status: 404 });
  }

  if (!id) {
    return json({ error: "missing_id" }, { status: 400 });
  }

  const metadata = parseMetadata(organization.metadata);
  const nextKeys = (metadata.api_keys ?? []).filter((key) => key.id !== id);

  if (nextKeys.length === (metadata.api_keys ?? []).length) {
    return json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await admin
    .from("organizations")
    .update({
      metadata: {
        ...metadata,
        api_keys: nextKeys,
      } as Json,
    } as never)
    .eq("id", organization.id);

  if (error) {
    return json({ error: "delete_failed" }, { status: 500 });
  }

  return json({ deleted: true, id });
};
