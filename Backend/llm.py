import os
from typing import List
from groq import Groq
from google import genai
from schemas import ContextChunk

def format_context_for_prompt(contexts: List[ContextChunk]) -> str:
    """Formats retrieved context chunks into a clean context string for the LLM."""
    if not contexts:
        return "No relevant context found in course materials."
    
    formatted_chunks = []
    for c in contexts:
        meta = c.metadata
        location_parts = []
        if meta.page_number is not None:
            location_parts.append(f"Page: {meta.page_number}")
        if meta.start_time is not None:
            location_parts.append(f"Timestamp: {meta.start_time}-{meta.end_time or ''}")
        
        location_str = f" | {', '.join(location_parts)}" if location_parts else ""
        source_label = f"[{meta.file_name}{location_str}]"
        
        formatted_chunks.append(
            f"Source ID: {c.chunk_id}\nSource File: {source_label}\nContent: {c.text}"
        )
        
    return "\n\n".join(formatted_chunks)


def generate_llm_response(query: str, contexts: List[ContextChunk], provider: str = "groq") -> str:
    """Generates an answer grounded in course material using Groq or Gemini."""
    context_str = format_context_for_prompt(contexts)
    
    prompt = f"""You are an expert AI tutor. Answer the student's question using ONLY the provided course context below.
If the context does not contain enough information to answer, state clearly that the course materials do not cover it.

--- COURSE CONTEXT ---
{context_str}

--- STUDENT QUESTION ---
{query}

--- INSTRUCTIONS ---
- Keep your response clear, concise, and accurate to the provided sources.
- Mention which source files or page numbers contain the relevant information.
"""

    if provider.lower() == "groq":
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Updated October 2026 Active Groq Models
        models_to_try = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b"
        ]
        
        last_exception = None
        for model_id in models_to_try:
            try:
                chat_completion = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model_id,
                    temperature=0.2,
                )
                return chat_completion.choices[0].message.content
            except Exception as e:
                last_exception = e
                continue
                
        raise RuntimeError(f"All Groq models failed. Last error: {last_exception}")

    elif provider.lower() == "gemini":
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text

    else:
        raise ValueError("Unsupported provider. Choose 'groq' or 'gemini'.")