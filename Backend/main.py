import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from schemas import ChatRequest, ChatResponse, Citation
from llm import generate_llm_response

load_dotenv()

app = FastAPI(
    title="Multimodal AI Tutor API",
    description="Backend API for personalized tutoring with citation guardrails.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
    Generate an LLM response based on retrieved context chunks.
    Pass query parameter ?provider=groq or ?provider=gemini.
    """
    try:
        # 1. Generate grounded answer
        answer = generate_llm_response(
            query=request.query,
            contexts=request.retrieved_contexts,
            provider=provider
        )
        
        # 2. Extract citations
        citations = [
            Citation(
                chunk_id=c.chunk_id,
                file_name=c.metadata.file_name,
                page_number=c.metadata.page_number,
                start_time=c.metadata.start_time,
                end_time=c.metadata.end_time,
                bboxes=c.metadata.bboxes,
            )
            for c in request.retrieved_contexts
        ]

        return ChatResponse(
            answer=answer,
            citations=citations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)