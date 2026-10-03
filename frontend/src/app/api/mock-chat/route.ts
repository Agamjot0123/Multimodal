import type { Citation } from "@/types/contract";

/**
 * Mock SSE endpoint mirroring the draft contract, so the UI can be built
 * before Member 2's FastAPI is live. Remove once NEXT_PUBLIC_API_BASE_URL is set.
 */
export const runtime = "edge";

const CITATIONS: Citation[] = [
  {
    id: "c1",
    label: "Slide 4, 02:15",
    file_name: "lecture_03_backprop.mp4",
    page_number: 4,
    start_time: 135,
    end_time: 172,
  },
  {
    id: "c2",
    label: "Textbook Pg 45",
    file_name: "deep_learning_textbook.pdf",
    page_number: 45,
    start_time: null,
    end_time: null,
  },
];

const ANSWER =
  "Backpropagation applies the chain rule layer by layer, reusing each layer's local gradient " +
  "instead of recomputing it [Slide 4, 02:15]. Formally, the gradient of the loss with respect to " +
  "a weight is the product of upstream and local gradients [Textbook Pg 45]. " +
  "Want a quick 3-question check on this?";

export async function POST() {
  const enc = new TextEncoder();
  const send = (event: string, data: unknown) =>
    enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      // Citations first so chips resolve as soon as their label streams in.
      for (const c of CITATIONS) controller.enqueue(send("citation", c));
      for (const word of ANSWER.split(/(?<= )/)) {
        controller.enqueue(send("token", { text: word }));
        await new Promise((r) => setTimeout(r, 35));
      }
      controller.enqueue(send("done", { message_id: crypto.randomUUID() }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
