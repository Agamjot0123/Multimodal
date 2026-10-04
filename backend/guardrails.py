import re
from typing import List, Tuple
from schemas import ContextChunk, Citation

# Regex to match tags like: [Source: file_name.pdf, Pg 12] or [Source: video.mp4, 02:15]
CITATION_REGEX = re.compile(
    r"\[Source:\s*([^,\]]+)(?:,\s*(Pg\s*\d+|\d{2}:\d{2}))?\]",
    re.IGNORECASE
)

def validate_and_sanitize_citations(
    answer: str,
    retrieved_contexts: List[ContextChunk]
) -> Tuple[str, List[Citation]]:
    """
    Scans the LLM answer for inline citation tags.
    - Validates them against the actual retrieved context chunks.
    - Removes hallucinated/unmatched citations from the answer text.
    - Builds the final verified list of Citation objects.
    """
    if not retrieved_contexts:
        # If no context was provided, remove any inline citation tags
        sanitized_text = CITATION_REGEX.sub("", answer)
        return sanitized_text.strip(), []

    # Map available metadata for fast lookup
    valid_citations_map = {}
    valid_file_names = set()
    
    for chunk in retrieved_contexts:
        meta = chunk.metadata
        valid_file_names.add(meta.file_name.lower())
        
        # Create lookup keys for exact matches
        if meta.page_number is not None:
            key = (meta.file_name.lower(), f"pg {meta.page_number}")
            valid_citations_map[key] = Citation(
                chunk_id=chunk.chunk_id,
                file_name=meta.file_name,
                page_number=meta.page_number
            )
        elif meta.start_time is not None:
            key = (meta.file_name.lower(), meta.start_time)
            valid_citations_map[key] = Citation(
                chunk_id=chunk.chunk_id,
                file_name=meta.file_name,
                start_time=meta.start_time,
                end_time=meta.end_time
            )
        else:
            key = (meta.file_name.lower(), None)
            valid_citations_map[key] = Citation(
                chunk_id=chunk.chunk_id,
                file_name=meta.file_name
            )

    verified_citations = []
    seen_chunk_ids = set()

    def replace_or_strip(match):
        file_name = match.group(1).strip().lower()
        location = match.group(2).strip().lower() if match.group(2) else None
        
        # Check direct lookup
        citation_obj = valid_citations_map.get((file_name, location))
        
        # Fallback check if file name matches
        if not citation_obj and file_name in valid_file_names:
            for (fname, _), c_obj in valid_citations_map.items():
                if fname == file_name:
                    citation_obj = c_obj
                    break

        if citation_obj:
            if citation_obj.chunk_id not in seen_chunk_ids:
                verified_citations.append(citation_obj)
                seen_chunk_ids.add(citation_obj.chunk_id)
            # Keep valid citation tag in the text
            return match.group(0)
        else:
            # Hallucinated source! Strip it out from the answer text
            return ""

    # Replace invalid tags in answer string
    sanitized_answer = CITATION_REGEX.sub(replace_or_strip, answer)
    
    # Clean up double spaces created by stripped tags
    sanitized_answer = re.sub(r" +", " ", sanitized_answer).strip()

    return sanitized_answer, verified_citations