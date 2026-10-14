import type { CourseSource } from "@/types/contract";

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

export const MOCK_SKILLS = [
  { skill: "Chain Rule", mastery: 0.72 },
  { skill: "Gradients", mastery: 0.55 },
  { skill: "Backprop", mastery: 0.31 },
  { skill: "Loss Fns", mastery: 0.64 },
  { skill: "Optimizers", mastery: 0.18 },
];

/** Local stand-in for Member 1's retrieval output. `skill` drives per-skill quizzes. */
export const MOCK_CHUNKS: { skill: string; chunk: import("@/types/contract").BackendChunk }[] = [
  {
    skill: "Backprop",
    chunk: {
      chunk_id: "c1",
      text: "Backpropagation applies the chain rule layer by layer, reusing each layer's local gradient instead of recomputing it.",
      metadata: { file_name: "lecture_03_backprop.mp4", page_number: null, start_time: "02:15", end_time: "02:52" },
    },
  },
  {
    skill: "Chain Rule",
    chunk: {
      chunk_id: "c2",
      text: "The gradient of the loss with respect to a weight is the product of the upstream gradient and the local gradient (chain rule).",
      metadata: { file_name: "deep_learning_textbook.pdf", page_number: 45, start_time: null, end_time: null },
    },
  },
  {
    skill: "Gradients",
    chunk: {
      chunk_id: "c3",
      text: "A gradient is the vector of partial derivatives; it points in the direction of steepest increase of the loss.",
      metadata: { file_name: "lecture_03_slides.pdf", page_number: 4, start_time: null, end_time: null },
    },
  },
  {
    skill: "Loss Fns",
    chunk: {
      chunk_id: "c4",
      text: "Mean squared error penalises large errors quadratically; cross-entropy is preferred for classification.",
      metadata: { file_name: "lecture_03_slides.pdf", page_number: 9, start_time: null, end_time: null },
    },
  },
  {
    skill: "Optimizers",
    chunk: {
      chunk_id: "c5",
      text: "Gradient descent updates weights by subtracting the learning rate times the gradient; Adam adds momentum and per-parameter scaling.",
      metadata: { file_name: "deep_learning_textbook.pdf", page_number: 112, start_time: null, end_time: null },
    },
  },
];

/** Normalized highlight boxes keyed by "file#page" (stand-in for coordinates from ingestion). */
export const MOCK_HIGHLIGHTS: Record<string, import("@/types/contract").HighlightRect[]> = {
  "lecture_03_slides.pdf#4": [{ x: 0.08, y: 0.3, w: 0.84, h: 0.12 }],
  "deep_learning_textbook.pdf#45": [{ x: 0.12, y: 0.42, w: 0.76, h: 0.08 }, { x: 0.12, y: 0.52, w: 0.5, h: 0.05 }],
};
