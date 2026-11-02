import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MODEL, client } from "./_lib/claude.js";

// Reading a printed title off a cover is a simple task, so a fast model tries first.
// If it can't read the cover, the main model gets one try (handles stylized lettering).
const FAST_MODEL = "claude-haiku-5-5";

const CoverSchema = z.object({
  found: z.boolean().describe("true if a book cover with a readable title is visible"),
  title: z.string(),
  author: z.string(),
});
type Cover = z.infer<typeof CoverSchema>;

const MAX_IMAGE_BASE64 = 5_000_000; // ~3.7 MB JPEG
const PROMPT = "This is a photo of a book cover. Read the book's title and author exactly as printed. If no book cover is clearly visible, set found to false and leave title and author empty.";

async function readCover(image: string, model: string): Promise<Cover | null> {
  const isFast = model === FAST_MODEL;
  const response = await client.beta.messages.parse({
    model,
    max_tokens: 2000,
    // Server-side fallback isn't available for the fast model; it has the main model as its fallback below.
    ...(isFast ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }),
    output_config: { effort: "low", format: betaZodOutputFormat(CoverSchema) },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
        { type: "text", text: PROMPT },
      ],
    }],
  // Fast attempt: no retries and a short timeout, since the main model is the backup.
  }, isFast ? { maxRetries: 0, timeout: 15_000 } : undefined);
  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return response.parsed_output;
}

// POST /api/identify-cover  body: { image: <base64 JPEG, no data: prefix> }
// Returns { found, title, author } read from a photo of a book cover.
export async function POST(request: Request): Promise<Response> {
  let image = "";
  try {
    image = (await request.json())?.image ?? "";
  } catch {
    // handled below
  }
  if (typeof image !== "string" || !image || image.length > MAX_IMAGE_BASE64) {
    return Response.json({ error: "Send a JPEG photo of the cover." }, { status: 400 });
  }

  try {
    let cover: Cover | null = null;
    try {
      cover = await readCover(image, FAST_MODEL);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) throw error;
      console.error("fast cover read failed, trying main model", error);
    }
    if (!cover?.found || !cover.title) cover = await readCover(image, MODEL);
    return Response.json(cover ?? { found: false, title: "", author: "" });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }
    console.error("identify-cover failed", error);
    return Response.json({ error: "We couldn't read that cover." }, { status: 502 });
  }
}
