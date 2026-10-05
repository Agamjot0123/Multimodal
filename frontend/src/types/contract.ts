/* ---------- Backend API contract — mirrors Backend/schemas.py exactly ---------- */

/** Source attribution metadata. Times are "mm:ss" strings (e.g. "02:15"). */
export interface SourceMetadata {
  file_name: string;
  page_number: number | null;
  start_time: string | null;
  end_time: string | null;
}

/** A retrieved chunk from Member 1's vector DB. */
export interface ContextChunk {
  chunk_id: string;
  text: string;
  metadata: SourceMetadata;
}

/** POST /api/chat request body. */
export interface ChatRequest {
  query: string;
  retrieved_contexts: ContextChunk[];
}

/** Citation object as returned by the backend. */
export interface ApiCitation {
  chunk_id: string;
  file_name: string;
  page_number: number | null;
  start_time: string | null;
  end_time: string | null;
}

/** POST /api/chat response body. */
export interface ChatResponse {
  answer: string;
  citations: ApiCitation[];
}

/* ---------- Frontend-only types ---------- */

export type SourceKind = "video" | "pdf" | "slides";

/** A course material file shown in the Sources pane. */
export interface CourseSource {
  file_name: string;
  kind: SourceKind;
  title: string;
  url: string; // served by backend / public folder
  duration?: number; // seconds, video only
  pages?: number; // pdf/slides only
}

/**
 * A citation as used by the UI: backend citation with times converted to
 * seconds (for seeking) and a `label` matching the inline "[...]" text.
 */
export interface Citation {
  id: string; // backend chunk_id
  label: string;
  file_name: string;
  page_number: number | null;
  start_time: number | null; // seconds
  end_time: number | null; // seconds
}
