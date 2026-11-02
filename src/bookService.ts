// Book lookup (Google Books, then Open Library) and AI analysis via /api/*.

export type Book = {
  title: string;
  authors: string[];
  isbn?: string;
  year?: string;
  publisher?: string;
  description?: string;
  coverUrl?: string;
};

export type CategoryResult = {
  name: string;
  status: "None" | "Mild" | "Present" | "Moderate" | "Strong";
  presence: string;
  intensity: string;
  context: string;
};

export type Analysis = {
  known: boolean;
  confidence: "high" | "medium" | "low";
  summary: string;
  ageRange: string;
  categories: CategoryResult[];
  conversationStarters: string[];
};

// Lets a static preview call a deployed API, e.g. VITE_API_BASE=https://pageclarity.vercel.app
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

export const cleanIsbn = (value: string) => value.replace(/[^0-9Xx]/g, "").toUpperCase();
export const isIsbn = (value: string) => /^(97[89]\d{10}|\d{9}[\dX])$/.test(cleanIsbn(value));

// Optional: a browser-restricted Google Books API key raises the free lookup quota.
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;

const https = (url?: string) => url?.replace(/^http:/, "https:");

async function getJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Lookup failed (${response.status})`);
  return response.json();
}

type GoogleVolume = {
  volumeInfo?: {
    title?: string; subtitle?: string; authors?: string[]; publishedDate?: string; publisher?: string; description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

function fromGoogle(item: GoogleVolume): Book | null {
  const info = item.volumeInfo;
  if (!info?.title) return null;
  const ids = info.industryIdentifiers || [];
  return {
    title: info.title, // subtitles are usually edition notes ("Full Color Edition"); leaving them out keeps saved results shared across editions
    authors: info.authors || [],
    isbn: ids.find((id) => id.type === "ISBN_13")?.identifier || ids.find((id) => id.type === "ISBN_10")?.identifier,
    year: info.publishedDate?.slice(0, 4),
    publisher: info.publisher,
    description: info.description?.replace(/<[^>]+>/g, "").slice(0, 4000),
    coverUrl: https(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
  };
}

async function searchGoogle(query: string): Promise<Book | null> {
  const q = isIsbn(query) ? `isbn:${cleanIsbn(query)}` : query;
  const data = await getJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&printType=books${GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ""}`);
  for (const item of data.items || []) {
    const book = fromGoogle(item);
    if (book) return book;
  }
  return null;
}

async function searchOpenLibrary(query: string): Promise<Book | null> {
  if (isIsbn(query)) {
    const isbn = cleanIsbn(query);
    const data = await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const entry = data[`ISBN:${isbn}`];
    if (!entry?.title) return null;
    return {
      title: entry.title,
      authors: (entry.authors || []).map((author: { name: string }) => author.name),
      isbn,
      year: entry.publish_date?.match(/\d{4}/)?.[0],
      publisher: entry.publishers?.[0]?.name,
      coverUrl: https(entry.cover?.medium),
    };
  }
  const data = await getJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,first_publish_year,isbn,cover_i`);
  const doc = data.docs?.[0];
  if (!doc?.title) return null;
  return {
    title: doc.title,
    authors: doc.author_name || [],
    isbn: doc.isbn?.find((value: string) => value.length === 13) || doc.isbn?.[0],
    year: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
  };
}

/** Finds a book by ISBN or by "title author" text. Returns null when nothing matches. */
export async function lookupBook(query: string): Promise<Book | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const book = await searchGoogle(trimmed);
    if (book) return book;
  } catch {
    // Google Books unavailable or rate limited: fall through to Open Library.
  }
  return searchOpenLibrary(trimmed);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "The analysis service isn't reachable.");
  return data as T;
}

export function analyzeBook(book: Book): Promise<Analysis> {
  const { coverUrl: _cover, ...details } = book;
  return postJson<Analysis>("/api/analyze", details);
}

export function identifyCover(jpegBase64: string): Promise<{ found: boolean; title: string; author: string }> {
  return postJson("/api/identify-cover", { image: jpegBase64 });
}
