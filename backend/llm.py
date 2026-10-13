import os
import json
from typing import List, Generator
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


def stream_llm_response(query: str, contexts: List[ContextChunk], provider: str = "groq") -> Generator[str, None, None]:
    """Streams LLM tokens word-by-word via Server-Sent Events (SSE)."""
    context_str = format_context_for_prompt(contexts)
    
    system_prompt = """You are an expert AI tutor. Answer the student's question using ONLY the provided course context chunks.

CRITICAL CITATION RULES:
1. Every factual statement or claim MUST be immediately followed by its corresponding Required Citation Tag.
2. Exact Citation Formats:
   - For PDFs/Slides: [Source: file_name, Pg X]
   - For Videos: [Source: file_name, MM:SS]
3. DO NOT invent citations or cite sources not provided in the context.
"""

    user_prompt = f"--- COURSE CONTEXT ---\n{context_str}\n\n--- STUDENT QUESTION ---\n{query}\n\n--- ANSWER ---"

    if provider.lower() == "groq":
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
        
        for model_id in models_to_try:
            try:
                stream = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    model=model_id,
                    temperature=0.1,
                    stream=True,
                )
                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                return
            except Exception:
                continue

    elif provider.lower() == "gemini":
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\n{user_prompt}",
        )
        for chunk in response:
            yield chunk.text


def generate_quiz_json(contexts: List[ContextChunk], num_questions: int = 3, provider: str = "groq") -> dict:
    """Generates structured multiple-choice quiz questions based on retrieved course chunks."""
    context_str = format_context_for_prompt(contexts)
    
    prompt = f"""You are an expert tutor. Generate exactly {num_questions} multiple-choice quiz questions based ONLY on the context below.

--- COURSE CONTEXT ---
{context_str}

Respond with strictly valid JSON using this format (no markdown formatting around the JSON):
{{
  "questions": [
    {{
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option_index": 0,
      "explanation": "Explanation here",
      "source_citation": "[Source: file_name, Pg X]"
    }}
  ]
}}
"""

    if provider.lower() == "groq":
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    else:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)

def generate_llm_response(query: str, contexts: List[ContextChunk], provider: str = "groq") -> str:
    """Generates a synchronous non-streaming answer from the LLM."""
    context_str = format_context_for_prompt(contexts)
    
    system_prompt = """You are an expert AI tutor. Answer the student's question using ONLY the provided course context chunks.

CRITICAL CITATION RULES:
1. Every factual statement or claim MUST be immediately followed by its corresponding Required Citation Tag.
2. Exact Citation Formats:
   - For PDFs/Slides:
   - For Videos:
3. DO NOT invent citations or cite sources not provided in the context.
"""
    user_prompt = f"--- COURSE CONTEXT ---\n{context_str}\n\n--- STUDENT QUESTION ---\n{query}\n\n--- ANSWER ---"

    if provider.lower() == "groq":
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
        for model_id in models_to_try:
            try:
                completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    model=model_id,
                    temperature=0.1,
                )
                return completion.choices[0].message.content
            except Exception:
                continue
        raise Exception("All Groq models failed.")
    else:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\n{user_prompt}",
        )
        return response.text