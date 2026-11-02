import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { bookKey, getCachedAnalysis, saveAnalyses } from "./_lib/cache.js";
import { AnalysisSchema, BookInputSchema, MODEL, SYSTEM_PROMPT, analysisUserMessage, client, normalizeAnalysis } from "./_lib/claude.js";

// POST /api/analyze  body: { title, authors[], isbn?, year?, publisher?, description? }
// Returns the content analysis JSON for the six PageClarity categories.
// Saved results are reused for every edition of the same book; Claude is only
// called the first time a book is seen.
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the book as JSON." }, { status: 400 });
  }
  const parsedBook = BookInputSchema.safeParse(body);
  if (!parsedBook.success) return Response.json({ error: "A book title is required." }, { status: 400 });
  const book = parsedBook.data;

  const key = bookKey(book.title, book.authors);
  const cached = await getCachedAnalysis(key);
  if (cached) return Response.json(cached, { headers: { "X-PageClarity-Cache": "hit" } });

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: analysisUserMessage(book) }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "We couldn't analyze this book right now." }, { status: 502 });
    }

    const analysis = normalizeAnalysis(response.parsed_output);
    await saveAnalyses([{ book_key: key, title: book.title, author: book.authors[0] || "", isbn: book.isbn, analysis, model: response.model, source: "live" }]);
    return Response.json(analysis, { headers: { "X-PageClarity-Cache": "miss" } });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY is missing or invalid");
      return Response.json({ error: "Analysis isn't set up yet." }, { status: 500 });
    }
    console.error("analyze failed", error);
    return Response.json({ error: "We couldn't analyze this book right now." }, { status: 502 });
  }
}
