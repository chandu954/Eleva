import { stubTable } from "@/test/postgrest-stub";

export const authedUser = { id: "user-1", email: "ada@example.com" };

export function table(result: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  return stubTable({ data: result.data ?? null, error: result.error ?? null, count: result.count });
}

export function daysAgoIso(reference: Date, daysAgo: number): string {
  const date = new Date(reference);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}
