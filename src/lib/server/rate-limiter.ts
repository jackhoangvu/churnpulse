import { admin } from "$lib/server/admin";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  const { count, error: countError } = await admin
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart);

  if (countError) {
    return true;
  }

  if ((count ?? 0) >= limit) {
    return false;
  }

  const insertResult = await admin
    .from("rate_limit_events")
    .insert({ key } as never);

  if (insertResult.error) {
    return true;
  }

  return true;
}
