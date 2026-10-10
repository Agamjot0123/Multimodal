/**
 * Shared metadata contract (Member 1 → Member 2 → Member 3).
 * Every chunk carries ALL four fields; unused ones are `null`
 * (PDF chunks have no times, video chunks have no page).
 */
export interface ChunkMetadata {
  file_name: string;
  page_number: number | null;
  start_time: number | null; // seconds
  end_time: number | null; // seconds
}

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

/** A citation as resolved by the backend validator. */
export interface Citation extends ChunkMetadata {
  id: string; // stable id, e.g. "c1"
  label: string; // exact inline text, e.g. "Slide 4, 02:15"
}

/* ---------- SSE stream events (draft for Member 2 to confirm) ---------- */

export type ChatStreamEvent =
  | { type: "token"; text: string }
  | { type: "citation"; citation: Citation }
  | { type: "done"; message_id: string }
  | { type: "error"; message: string };

export interface ChatRequest {
  question: string;
  course_id: string;
  student_id: string;
  /** Skill level from BKT, used by backend for prompt steering (Day 7). */
  mastery_level?: "novice" | "developing" | "proficient";
}
