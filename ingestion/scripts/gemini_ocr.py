import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = "gemini-3.5-flash-lite"

_client = None

def get_gemini_client():
    """Create the Gemini client only when OCR is needed."""
    global _client

    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is missing. Check your project-root .env file."
            )

        _client = genai.Client(api_key=api_key)

    return _client


def extract_text_with_gemini(
    image_bytes: bytes,
    mime_type: str = "image/png",
) -> str:
    """Transcribe visible text from an image using Gemini OCR."""
    if not image_bytes:
        raise ValueError("Image data is empty.")

    prompt = """
Transcribe all visible text in this image as accurately as possible.

Instructions:
- Preserve the original wording, spelling, and paragraph structure.
- Preserve headings, bullet points, and numbered lists.
- Include handwritten and printed text.
- Preserve mathematical equations and symbols as faithfully as possible.
- Describe a diagram's labels and visible text when useful.
- Do not answer questions, solve problems, summarize, or invent missing text.
- If a small portion is unreadable, mark it as [unclear].
- Return only the transcription, without introductory commentary.
"""

    response = get_gemini_client().models.generate_content(
        model=MODEL_NAME,
        contents=[
            prompt,
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type,
            ),
        ],
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty OCR response.")

    return response.text.strip()