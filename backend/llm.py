import os
from typing import List
from groq import Groq
from google import genai
from schemas import ContextChunk

def format_context_for_prompt(contexts: List[ContextChunk]) -> str:
    """Formats retrieved context chunks with strict source tag metadata."""
    if not contexts:
        return "No relevant context found in course materials."
    
    formatted_chunks = []
    for c in contexts:
        meta = c.metadata
        # Create citation tag instruction for LLM
        if meta.page_number is not None:
            cite_tag = f"[Source: {meta.file_name}, Pg {meta.page_number}]"
        elif meta.start_time is not None:
            cite_tag = f"[Source: {meta.file_name}, {meta.start_time}]"
        else:
            cite_tag = f"[Source: {meta.file_name}]"
            
        formatted_chunks.append(
            f"--- START CHUNK (ID: {c.chunk_id}) ---\n"
            f"Required Citation Tag: {cite_tag}\n"
            f"Content: {c.text}\n"
            f"--- END CHUNK ---"
        )
        
    return "\n\n".join(formatted_chunks)


def generate_llm_response(query: str, contexts: List[ContextChunk], provider: str = "groq") -> str:
    """Generates an answer grounded in course material with strict inline Markdown citations."""
    context_str = format_context_for_prompt(contexts)
    
    system_prompt = """You are an expert AI tutor. Answer the student's question using ONLY the provided course context chunks.

CRITICAL CITATION RULES:
1. Every factual statement or claim MUST be immediately followed by its corresponding Required Citation Tag.
2. Exact Citation Formats:
   - For PDFs/Slides: [Source: file_name, Pg X]
   - For Videos: [Source: file_name, MM:SS]
3. DO NOT invent citations or cite sources not provided in the context.
4. If the provided context does not contain enough information to answer the question, state: "The provided course materials do not contain sufficient information to answer this question."
"""

    user_prompt = f"""--- COURSE CONTEXT ---
{context_str}

--- STUDENT QUESTION ---
{query}

--- ANSWER ---
"""

    if provider.lower() == "groq":
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        models_to_try = [
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b"
        ]
        
        last_exception = None
        for model_id in models_to_try:
            try:
                chat_completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    model=model_id,
                    temperature=0.1,
                )
                return chat_completion.choices[0].message.content
            except Exception as e:
                last_exception = e
                continue
                
        raise RuntimeError(f"All Groq models failed. Last error: {last_exception}")

    elif provider.lower() == "gemini":
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt,
        )
        return response.text

    else:
        raise ValueError("Unsupported provider. Choose 'groq' or 'gemini'.")