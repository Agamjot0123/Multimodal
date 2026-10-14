/** Mock of POST /api/quiz (QuizResponse shape) for running without the backend. */
export async function POST(req: Request) {
  const { retrieved_contexts = [], num_questions = 3 } = await req.json().catch(() => ({}));
  const base = retrieved_contexts[0]?.metadata?.file_name ?? "lecture_03_slides.pdf";
  const pool = [
    { question: "What does backpropagation reuse to avoid recomputation?", options: ["Local gradients", "The dataset", "Random seeds", "Learning rate"], correct: 0, explanation: "Each layer's local gradient is reused via the chain rule." },
    { question: "The gradient of the loss w.r.t. a weight is the product of…", options: ["Loss and weight", "Upstream and local gradients", "Two biases", "Inputs only"], correct: 1, explanation: "That is the chain rule applied across layers." },
    { question: "A gradient points toward…", options: ["Steepest decrease", "Zero loss", "Steepest increase", "The mean"], correct: 2, explanation: "Gradient ascent direction; descent subtracts it." },
    { question: "Which loss is typical for classification?", options: ["Cross-entropy", "MSE", "Hinge on pixels", "L0 norm"], correct: 0, explanation: "Cross-entropy matches probabilistic outputs." },
    { question: "Adam adds what to plain gradient descent?", options: ["Dropout", "Momentum and per-parameter scaling", "Batch norm", "Larger batches"], correct: 1, explanation: "Adam keeps moment estimates per parameter." },
  ];
  const questions = Array.from({ length: Math.min(num_questions, pool.length) }, (_, i) => ({
    id: i + 1,
    question: pool[i].question,
    options: pool[i].options,
    correct_option_index: pool[i].correct,
    explanation: pool[i].explanation,
    source_citation: `[Source: ${base}]`,
  }));
  return Response.json({ questions });
}
