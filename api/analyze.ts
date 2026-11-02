import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnalysisSchema, BookInputSchema, CATEGORY_NAMES, MODEL, SYSTEM_PROMPT, client } from "./_lib/claude.js";

// POST /api/analyze  body: { title, authors[], isbn?, year?, publisher?, description? }
// Returns the content analysis JSON for the six PageClarity categories.
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

  const bookDetails = [
    `Title: ${book.title}`,
    book.authors.length ? `Author(s): ${book.authors.join(", ")}` : null,
    book.isbn ? `ISBN: ${book.isbn}` : null,
    book.year ? `Published: ${book.year}` : null,
    book.publisher ? `Publisher: ${book.publisher}` : null,
    book.description ? `Publisher description:\n${book.description}` : null,
  ].filter(Boolean).join("\n");

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyze this book:\n\n${bookDetails}` }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "We couldn't analyze this book right now." }, { status: 502 });
    }

    // Keep the categories in the app's fixed order, one entry each.
    const analysis = response.parsed_output;
    analysis.categories = CATEGORY_NAMES.map((name) => analysis.categories.find((item) => item.name === name) ?? {
      name, status: "None" as const, presence: "None" as const, intensity: "None" as const, context: "Not assessed.",
    });
    analysis.conversationStarters = analysis.conversationStarters.slice(0, 2);
    return Response.json(analysis, { headers: { "Cache-Control": "s-maxage=86400" } });
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
