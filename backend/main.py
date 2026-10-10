import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from schemas import ChatRequest, ChatResponse
from llm import generate_llm_response
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

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, provider: str = "groq"):
    """
    Generate an LLM response and apply strict citation guardrails to strip hallucinations.
    """
    try:
        # 1. Generate raw response from LLM
        raw_answer = generate_llm_response(
            query=request.query,
            contexts=request.retrieved_contexts,
            provider=provider
        )
        
        # 2. Run Guardrail Parser & Sanitizer
        clean_answer, verified_citations = validate_and_sanitize_citations(
            answer=raw_answer,
            retrieved_contexts=request.retrieved_contexts
        )

        return ChatResponse(
            answer=clean_answer,
            citations=verified_citations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)