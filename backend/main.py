import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from schemas import ChatRequest, ChatResponse, QuizRequest, QuizResponse
from llm import stream_llm_response, generate_quiz_json
from guardrails import validate_and_sanitize_citations

load_dotenv()

app = FastAPI(
    title="Multimodal AI Tutor API",
    description="Backend API for personalized tutoring with citation guardrails.",
    version="1.0.0"
)

# Updated CORS configuration for local and production frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",  # Production Vercel wildcards
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "groq_key_configured": bool(os.getenv("GROQ_API_KEY")),
        "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.post("/api/chat/stream")
def chat_stream_endpoint(request: ChatRequest, provider: str = "groq"):
    """
    Server-Sent Events (SSE) streaming endpoint for real-time word-by-word responses.
    """
    def event_generator():
        for token in stream_llm_response(request.query, request.retrieved_contexts, provider):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/quiz", response_model=QuizResponse)
def quiz_endpoint(request: QuizRequest, provider: str = "groq"):
    """
    Generates a structured multiple-choice quiz based on course material.
    """
    try:
        quiz_data = generate_quiz_json(
            contexts=request.retrieved_contexts,
            num_questions=request.num_questions,
            provider=provider
        )
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)