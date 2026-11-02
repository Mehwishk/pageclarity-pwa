import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Analysis } from "./claude.js";

// Saved analyses, one row per book (not per edition). Stores book details and the
// analysis only, never anything about a child or parent. See supabase/schema.sql.

const TABLE = "book_analyses";

let supabase: SupabaseClient | null | undefined;

/**
 * Accepts the API URL ("https://<ref>.supabase.co") and the usual paste mistakes:
 * surrounding spaces or quotes, a missing https://, a bare project ref, or a
 * dashboard link ("https://supabase.com/dashboard/project/<ref>/...").
 */
export function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim().replace(/^["']|["']$/g, "").trim().replace(/\/+$/, "");
  if (!value) return undefined;
  const dashboard = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboard) return `https://${dashboard[1].toLowerCase()}.supabase.co`;
  if (/^[a-z0-9]{15,30}$/i.test(value)) return `https://${value.toLowerCase()}.supabase.co`;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}`;
  } catch {
    throw new Error(`SUPABASE_URL isn't a valid address. It should look like https://abcdefghijklmnop.supabase.co (Supabase -> Project Settings -> API -> Project URL).`);
  }
}

/** Returns null when Supabase isn't configured, so caching is simply skipped. */
function db(): SupabaseClient | null {
  if (supabase === undefined) {
    const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "");
    supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  }
  return supabase;
}

const LEADING_ARTICLE = /^(the|a|an)\s+/;
const simplify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and");

/**
 * One key per book, shared by all editions: title without bracketed edition or
 * series notes and without a leading article, + first author's last name.
 * Colons are kept on purpose: "Wings of Fire: Moon Rising" must not match
 * "Wings of Fire: The Dragonet Prophecy". A missed match costs one analysis;
 * a wrong match would show the wrong book.
 * "The Giver" / "Lois Lowry" -> "giver|lowry"
 */
export function bookKey(title: string, authors: string[]): string {
  const mainTitle = simplify(title).split(/[(\[]/)[0].trim().replace(LEADING_ARTICLE, "").replace(/[^a-z0-9]/g, "");
  const author = simplify(authors[0] || "").trim();
  // "Lowry, Lois" -> "lowry"; "Lois Lowry" -> "lowry"
  const lastName = (author.includes(",") ? author.split(",")[0] : author.split(/\s+/).pop() || "").replace(/[^a-z0-9]/g, "");
  return `${mainTitle}|${lastName}`;
}

export async function getCachedAnalysis(key: string): Promise<Analysis | null> {
  const client = db();
  if (!client) return null;
  const { data, error } = await client.from(TABLE).select("analysis").eq("book_key", key).maybeSingle();
  if (error) { console.error("cache read failed", error.message); return null; }
  return (data?.analysis as Analysis | undefined) ?? null;
}

export async function getCachedKeys(keys: string[]): Promise<Set<string>> {
  const client = db();
  if (!client || keys.length === 0) return new Set();
  const found = new Set<string>();
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await client.from(TABLE).select("book_key").in("book_key", keys.slice(i, i + 200));
    if (error) throw new Error(`cache read failed: ${error.message}`);
    data?.forEach((row) => found.add(row.book_key as string));
  }
  return found;
}

export type CacheRow = { book_key: string; title: string; author: string; isbn?: string; analysis: Analysis; model: string; source: "live" | "batch" };

export async function saveAnalyses(rows: CacheRow[]): Promise<void> {
  const client = db();
  if (!client || rows.length === 0) return;
  const { error } = await client.from(TABLE).upsert(rows, { onConflict: "book_key" });
  if (error) console.error("cache write failed", error.message);
}

export const cacheEnabled = () => db() !== null;
