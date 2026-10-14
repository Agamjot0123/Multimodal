import os
import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from pydantic import BaseModel

from schemas import QuizRequest, QuizResponse
from auth import get_current_user, AuthenticatedUser
from vector_store import search_permission_scoped_chunks
from llm import generate_llm_response, stream_llm_response, generate_quiz_json
from guardrails import validate_and_sanitize_citations
from routers import communities, chats

load_dotenv()

app = FastAPI(
    title="Multimodal AI Tutor API",
    description="Backend API with Google (Express) Auth, Community Endpoints, and Permission-Scoped Vector Search.",
    version="2.0.0"
)

# CORS: localhost for development, plus FRONTEND_ORIGINS (comma-separated) for production.
# Auth uses Bearer tokens, not cookies, so credentials are not needed.
ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"] + [
    o.strip().rstrip("/") for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=os.getenv("FRONTEND_ORIGIN_REGEX") or None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(communities.router)
app.include_router(chats.router)


class AuthenticatedChatRequest(BaseModel):
    query: str


@app.get("/")
def health_check():
    return {
        "status": "online",
        "version": "2.0.0",
        "groq_key_configured": bool(os.getenv("GROQ_API_KEY")),
        "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY"))
    }


@app.post("/api/chat")
def chat_endpoint(
    req: AuthenticatedChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    provider: str = "groq"
):
    """
    1. Validates the Google session via the auth server.
    2. Runs permission-scoped ChromaDB query for the current user.
    3. Generates LLM response with citation guardrails.
    """
    try:
        # Step A: Retrieve permission-scoped context chunks
        contexts = search_permission_scoped_chunks(query=req.query, user=current_user)

        # Step B: Generate raw response from LLM
        raw_answer = generate_llm_response(
            query=req.query,
            contexts=contexts,
            provider=provider
        )

        # Step C: Sanitize citations using Guardrail parser
        clean_answer, verified_citations = validate_and_sanitize_citations(
            answer=raw_answer,
            retrieved_contexts=contexts
        )

        return {
            "answer": clean_answer,
            "citations": verified_citations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/stream")
def chat_stream_endpoint(
    req: AuthenticatedChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    provider: str = "groq"
):
    """
    Authenticated Server-Sent Events (SSE) streaming endpoint.
    """
    contexts = search_permission_scoped_chunks(query=req.query, user=current_user)

    def event_generator():
        for token in stream_llm_response(req.query, contexts, provider):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/quiz", response_model=QuizResponse)
def quiz_endpoint(
    request: QuizRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    provider: str = "groq"
):
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