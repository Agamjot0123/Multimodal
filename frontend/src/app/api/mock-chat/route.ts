/**
 * Mock of the backend's POST /api/chat/stream (same wire format):
 *   data: {"token": "..."}\n\n  ...  data: [DONE]\n\n
 * Used when NEXT_PUBLIC_API_BASE_URL is empty.
 */
export const runtime = "edge";

const ANSWER =
  "Backpropagation applies the chain rule layer by layer, reusing each layer's local gradient " +
  "instead of recomputing it [Source: lecture_03_backprop.mp4, 02:15]. Formally, the gradient of the loss with respect to " +
  "a weight is the product of upstream and local gradients [Source: deep_learning_textbook.pdf, Pg 45]. " +
  "Want a quick 3-question check on this?";

export async function POST() {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const word of ANSWER.split(/(?<= )/)) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ token: word })}\n\n`));
        await new Promise((r) => setTimeout(r, 35));
      }
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}
