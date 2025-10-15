import { api } from "./client";

export type Health = { status: string };

export async function fetchHealth(): Promise<Health> {
  const { data } = await api.get<Health>("/health");
  return data;
}
