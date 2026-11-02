// Pre-analyzes popular books with Claude's Batch API (half price) and saves the
// results to Supabase, so most scans in the app are served from saved results.
//
//   npm run library -- submit    send new books from popular-books.txt as a batch
//   npm run library -- status    show progress of the last batch
//   npm run library -- collect   save finished results to Supabase
//   npm run library -- run       submit, wait for it to finish, then collect
//
// Needs ANTHROPIC_API_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// (from .env.local, or the environment / GitHub Actions secrets).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { bookKey, cacheEnabled, checkConnection, getCachedKeys, saveAnalyses, type CacheRow } from "../api/_lib/cache.js";
import { AnalysisSchema, MODEL, SYSTEM_PROMPT, analysisUserMessage, client, normalizeAnalysis } from "../api/_lib/claude.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const LIST_FILE = path.join(here, "popular-books.txt");
const STATE_FILE = path.join(here, ".library-batch.json");

type ListedBook = { id: string; title: string; author: string; key: string };
type BatchState = { batchId: string; createdAt: string; books: ListedBook[] };

function readList(): ListedBook[] {
  const seen = new Set<string>();
  const books: ListedBook[] = [];
  for (const line of readFileSync(LIST_FILE, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [title, author = ""] = trimmed.split("|").map((part) => part.trim());
    if (!title) continue;
    const key = bookKey(title, [author]);
    if (seen.has(key)) continue; // duplicates in the list
    seen.add(key);
    books.push({ id: `book-${books.length + 1}`, title, author, key });
  }
  return books;
}

const readState = (): BatchState => {
  if (!existsSync(STATE_FILE)) throw new Error("No batch submitted yet. Run: npm run library -- submit");
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
};

async function submit(): Promise<BatchState | null> {
  if (!cacheEnabled()) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first, or the results would have nowhere to go.");
  await checkConnection();
  console.log("Supabase connection OK.");
  const listed = readList();
  const saved = await getCachedKeys(listed.map((book) => book.key));
  const books = listed.filter((book) => !saved.has(book.key));
  console.log(`${listed.length} books in the list, ${saved.size} already saved, ${books.length} to analyze.`);
  if (books.length === 0) return null;

  const batch = await client.messages.batches.create({
    requests: books.map((book) => ({
      custom_id: book.id,
      params: {
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort: "medium", format: zodOutputFormat(AnalysisSchema) },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: analysisUserMessage({ title: book.title, authors: book.author ? [book.author] : [] }) }],
      },
    })),
  });
  const state = { batchId: batch.id, createdAt: new Date().toISOString(), books };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`Submitted batch ${batch.id}. Most batches finish within an hour.`);
  return state;
}

async function status(batchId = readState().batchId) {
  const batch = await client.messages.batches.retrieve(batchId);
  const counts = batch.request_counts;
  console.log(`${batch.id}: ${batch.processing_status} · ${counts.succeeded} done, ${counts.processing} processing, ${counts.errored} errored`);
  return batch;
}

async function collect(state = readState()) {
  const batch = await status(state.batchId);
  if (batch.processing_status !== "ended") { console.log("Not finished yet. Try again later."); return; }

  const byId = new Map(state.books.map((book) => [book.id, book]));
  const rows: CacheRow[] = [];
  const failed: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const entry of await client.messages.batches.results(state.batchId)) {
    const book = byId.get(entry.custom_id);
    if (!book) continue;
    if (entry.result.type !== "succeeded") { failed.push(`${book.title} (${entry.result.type})`); continue; }
    const message = entry.result.message;
    inputTokens += message.usage.input_tokens;
    outputTokens += message.usage.output_tokens;
    const text = message.content.find((block) => block.type === "text");
    if (message.stop_reason !== "end_turn" || !text || text.type !== "text") { failed.push(`${book.title} (${message.stop_reason})`); continue; }
    let json: unknown;
    try { json = JSON.parse(text.text); } catch { failed.push(`${book.title} (bad JSON)`); continue; }
    const parsed = AnalysisSchema.safeParse(json);
    if (!parsed.success) { failed.push(`${book.title} (unexpected shape)`); continue; }
    rows.push({ book_key: book.key, title: book.title, author: book.author, analysis: normalizeAnalysis(parsed.data), model: message.model, source: "batch" });
  }

  for (let i = 0; i < rows.length; i += 100) await saveAnalyses(rows.slice(i, i + 100));
  // Batch pricing is half of the standard $4 / $20 per million tokens for this model.
  const cost = (inputTokens * 2 + outputTokens * 10) / 1_000_000;
  console.log(`Saved ${rows.length} analyses. Tokens: ${inputTokens} in, ${outputTokens} out (about $${cost.toFixed(2)}).`);
  if (failed.length) console.log(`Not saved (${failed.length}): ${failed.join("; ")}. Re-run submit to retry them.`);
}

async function run() {
  const state = await submit();
  if (!state) return;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    const batch = await status(state.batchId);
    if (batch.processing_status === "ended") break;
  }
  await collect(state);
}

const command = process.argv[2];
const commands: Record<string, () => Promise<unknown>> = { submit, status: () => status(), collect: () => collect(), run };
if (!command || !commands[command]) {
  console.log("Usage: npm run library -- submit | status | collect | run");
  process.exit(1);
}
commands[command]().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
