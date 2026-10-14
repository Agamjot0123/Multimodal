import type { BackendChunk } from "@/types/contract";

/** Sample passages behind the homepage hero demo only; the workspace uses real data. */
export const MOCK_CHUNKS: { skill: string; chunk: BackendChunk }[] = [
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
