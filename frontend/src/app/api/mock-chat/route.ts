import type { ChatRequest, ChatResponse } from "@/types/contract";

/**
 * Mock of the backend's POST /api/chat (Backend/main.py) so the UI works without FastAPI.
 * Remove once NEXT_PUBLIC_API_BASE_URL is set.
 */
export const runtime = "edge";

const ANSWER =
  "Backpropagation applies the chain rule layer by layer, reusing each layer's local gradient " +
  "instead of recomputing it [lecture_03_backprop.mp4 | Timestamp: 02:15-02:52] — in short, upstream " +
  "gradient × local gradient [lecture_03_slides.pdf | Page: 4]. Formally, the gradient " +
  "of the loss with respect to a weight is the product of upstream and local gradients " +
  "[deep_learning_textbook.pdf | Page: 45].";

export async function POST(req: Request) {
  const { retrieved_contexts = [] } = (await req.json()) as ChatRequest;
  await new Promise((r) => setTimeout(r, 600));

  // Like the backend: one citation per retrieved chunk.
  const body: ChatResponse = {
    answer: ANSWER,
    citations: retrieved_contexts.map((c) => ({ chunk_id: c.chunk_id, ...c.metadata })),
  };
  return Response.json(body);
}
