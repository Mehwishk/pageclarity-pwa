import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Files under api/_lib are shared helpers, not deployed as endpoints.

export const MODEL = "claude-opus-5-5";

// Reads ANTHROPIC_API_KEY from the Vercel project's environment variables.
export const client = new Anthropic();

export const CATEGORY_NAMES = ["Violence", "Sexual Content", "Language", "Substance Use", "LGBTQ+ Themes", "Mature Themes"] as const;

export const AnalysisSchema = z.object({
  known: z.boolean().describe("true only if you are confident you know this specific book's actual content"),
  confidence: z.enum(["high", "medium", "low"]),
  summary: z.string().describe("One or two sentences a parent can read at a glance"),
  ageRange: z.string().describe('Typical reader age range, e.g. "8–12"'),
  categories: z.array(
    z.object({
      name: z.enum(CATEGORY_NAMES),
      status: z.enum(["None", "Mild", "Present", "Moderate", "Strong"]),
      presence: z.enum(["None", "Brief", "Occasional", "Recurring", "Pervasive"]),
      intensity: z.enum(["None", "Gentle", "Moderate", "Intense"]),
      context: z.string().describe("What the content is and how it is handled, without graphic detail"),
    }),
  ),
  conversationStarters: z.array(z.string()).describe("Two open questions a parent could ask their child about the book"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const BookInputSchema = z.object({
  title: z.string().min(1).max(300),
  authors: z.array(z.string().max(200)).max(10).default([]),
  isbn: z.string().max(20).optional(),
  year: z.string().max(20).optional(),
  publisher: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
});

export type BookInput = z.infer<typeof BookInputSchema>;

export const SYSTEM_PROMPT = `You are PageClarity's content analyst. Parents use PageClarity to learn what is in a book before their child reads it.

For the book you are given, rate each of these six categories, in this order: ${CATEGORY_NAMES.join(", ")}.

Rules:
- Describe facts about the book's content. Stay neutral and non-judgmental; parents apply their own values through their profile settings.
- "status" is the overall level: None (absent), Mild, Present (notable but not intense), Moderate, Strong.
- "presence" is how often it appears; "intensity" is how explicit it is. Use None for both when status is None.
- "context" is one or two plain sentences on what happens and how it is handled. No graphic detail, and avoid major spoilers where you can.
- Base the analysis on what you actually know about this specific book. If you do not recognize it, or only know it vaguely, set known to false and confidence to "low", rely only on the provided description, and say in the summary that the analysis is limited. Never invent plot details.
- Give exactly two conversation starters.`;

/** The user message for one book. Shared by the live endpoint and the batch script. */
export function analysisUserMessage(book: BookInput): string {
  const details = [
    `Title: ${book.title}`,
    book.authors.length ? `Author(s): ${book.authors.join(", ")}` : null,
    book.isbn ? `ISBN: ${book.isbn}` : null,
    book.year ? `Published: ${book.year}` : null,
    book.publisher ? `Publisher: ${book.publisher}` : null,
    book.description ? `Publisher description:\n${book.description}` : null,
  ].filter(Boolean).join("\n");
  return `Analyze this book:\n\n${details}`;
}

/** Puts categories in the app's fixed order (one each) and keeps two conversation starters. */
export function normalizeAnalysis(analysis: Analysis): Analysis {
  return {
    ...analysis,
    categories: CATEGORY_NAMES.map((name) => analysis.categories.find((item) => item.name === name) ?? {
      name, status: "None" as const, presence: "None" as const, intensity: "None" as const, context: "Not assessed.",
    }),
    conversationStarters: analysis.conversationStarters.slice(0, 2),
  };
}
