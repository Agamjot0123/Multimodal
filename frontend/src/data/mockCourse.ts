import type { ContextChunk, CourseSource } from "@/types/contract";

/** Placeholder course until Member 1's curated dataset lands. Drop files in /public/media. */
export const MOCK_COURSE_ID = "cs101-demo";

export const MOCK_SOURCES: CourseSource[] = [
  {
    file_name: "lecture_03_backprop.mp4",
    kind: "video",
    title: "Lecture 3: Backpropagation",
    url: "/media/lecture_03_backprop.mp4",
    duration: 2710,
  },
  {
    file_name: "lecture_03_slides.pdf",
    kind: "slides",
    title: "Lecture 3 Slides",
    url: "/media/lecture_03_slides.pdf",
    pages: 32,
  },
  {
    file_name: "deep_learning_textbook.pdf",
    kind: "pdf",
    title: "Textbook: Deep Learning",
    url: "/media/deep_learning_textbook.pdf",
    pages: 412,
  },
];

/**
 * Placeholder retrieval results sent as `retrieved_contexts` (backend does no retrieval itself).
 * Replace with Member 1's vector DB lookup.
 */
export const MOCK_CONTEXTS: ContextChunk[] = [
  {
    chunk_id: "lec03-v-0135",
    text:
      "Backpropagation walks the network from output to input, applying the chain rule at each layer. " +
      "Each layer's local gradient is computed once and reused, rather than recomputed for every weight.",
    metadata: { file_name: "lecture_03_backprop.mp4", page_number: null, start_time: "02:15", end_time: "02:52" },
  },
  {
    chunk_id: "lec03-s-04",
    text: "Slide 4 — Backprop = chain rule + caching. dL/dw = (upstream gradient) × (local gradient).",
    metadata: { file_name: "lecture_03_slides.pdf", page_number: 4, start_time: null, end_time: null },
  },
  {
    chunk_id: "dl-tb-045",
    text:
      "The gradient of the loss with respect to a weight equals the product of the upstream gradient " +
      "flowing into the unit and the local gradient of the unit's output with respect to that weight.",
    metadata: { file_name: "deep_learning_textbook.pdf", page_number: 45, start_time: null, end_time: null },
  },
];

export const MOCK_SKILLS = [
  { skill: "Chain Rule", mastery: 0.72 },
  { skill: "Gradients", mastery: 0.55 },
  { skill: "Backprop", mastery: 0.31 },
  { skill: "Loss Fns", mastery: 0.64 },
  { skill: "Optimizers", mastery: 0.18 },
];
