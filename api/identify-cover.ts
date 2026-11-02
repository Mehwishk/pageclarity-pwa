import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { MODEL, client } from "./_lib/claude.js";

const CoverSchema = z.object({
  found: z.boolean().describe("true if a book cover with a readable title is visible"),
  title: z.string(),
  author: z.string(),
});

const MAX_IMAGE_BASE64 = 5_000_000; // ~3.7 MB JPEG

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
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(CoverSchema) },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: "This is a photo of a book cover. Read the book's title and author exactly as printed. If no book cover is clearly visible, set found to false and leave title and author empty." },
        ],
      }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ found: false, title: "", author: "" });
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }
    console.error("identify-cover failed", error);
    return Response.json({ error: "We couldn't read that cover." }, { status: 502 });
  }
}
