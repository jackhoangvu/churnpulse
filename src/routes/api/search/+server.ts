import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { admin } from "$lib/server/admin";
import { resolveOrganization } from "$lib/server/organizations";
import type { ChurnSignalRow } from "$lib/types/supabase";

export const GET: RequestHandler = async ({ locals, url }) => {
  const organization = await resolveOrganization(locals.session?.userId);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!organization || query.length < 2) {
    return json({ results: [] });
  }

  const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const { data, error } = await admin
    .from("churn_signals")
    .select("id, customer_name, customer_email, signal_type")
    .eq("org_id", organization.id)
    .or(
      `customer_name.ilike.${pattern},customer_email.ilike.${pattern},signal_type.ilike.${pattern}`,
    )
    .order("detected_at", { ascending: false })
    .limit(5);

  if (error) {
    return json({ results: [] }, { status: 500 });
  }

  const rows = ((data ?? []) as Pick<
    ChurnSignalRow,
    "id" | "customer_name" | "customer_email" | "signal_type"
  >[]);

  return json({
    results: rows.map((row) => ({
      id: row.id,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      signal_type: row.signal_type,
    })),
  });
};
