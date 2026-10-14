
import tiktoken


def chunk_document(
    document: dict,
    chunk_size: int = 400,
    overlap: int = 50,
) -> list[dict]:
    """
    Split document text into token-based chunks.
    Preserve source metadata for every chunk.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be non-negative and smaller than chunk_size."
        )

    tokenizer = tiktoken.get_encoding("cl100k_base")
    chunks = []

    for page in document.get("pages", []):
        text = page.get("text", "").strip()

        if not text:
            continue

        tokens = tokenizer.encode(text)
        start = 0
        chunk_index = 0

        while start < len(tokens):
            end = min(start + chunk_size, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = tokenizer.decode(chunk_tokens).strip()

            if chunk_text:
                chunks.append({
                    "file_name": page.get(
                        "file_name", document.get("file_name")
                    ),
                    "page_number": page.get("page_number"),
                    "start_time": None,
                    "end_time": None,
                    "chunk_index": chunk_index,
                    "text": chunk_text,
                    "token_count": len(chunk_tokens),
                })
                chunk_index += 1

            if end >= len(tokens):
                break

            start = end - overlap

    return chunks


def chunk_transcript(
    segments: list[dict],
    file_name: str,
    chunk_size: int = 400,
    overlap: int = 50,
) -> list[dict]:
    """
    Combine timestamped transcript segments into token-based chunks.
    Each chunk preserves its start and end timestamps.
    """
    import tiktoken

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be non-negative and smaller than chunk_size."
        )

    tokenizer = tiktoken.get_encoding("cl100k_base")
    chunks = []
    current_segments = []
    current_tokens = 0
    chunk_index = 0

    def save_chunk():
        nonlocal chunk_index

        if not current_segments:
            return

        text = " ".join(
            item["text"].strip()
            for item in current_segments
            if item["text"].strip()
        )

        if text:
            chunks.append({
                "file_name": file_name,
                "page_number": None,
                "start_time": current_segments[0]["start"],
                "end_time": current_segments[-1]["end"],
                "chunk_index": chunk_index,
                "text": text,
                "token_count": len(tokenizer.encode(text)),
            })
            chunk_index += 1

    for segment in segments:
        text = segment.get("text", "").strip()
        if not text:
            continue

        tokens = tokenizer.encode(text)

        # Split a single oversized segment so it fits the token limit.
        if len(tokens) > chunk_size:
            save_chunk()
            current_segments.clear()
            current_tokens = 0

            start = 0
            while start < len(tokens):
                end = min(start + chunk_size, len(tokens))
                piece = tokenizer.decode(tokens[start:end]).strip()

                if piece:
                    chunks.append({
                        "file_name": file_name,
                        "page_number": None,
                        "start_time": segment["start"],
                        "end_time": segment["end"],
                        "chunk_index": chunk_index,
                        "text": piece,
                        "token_count": len(tokens[start:end]),
                    })
                    chunk_index += 1

                if end == len(tokens):
                    break
                start = end - overlap

            continue

        if current_tokens + len(tokens) > chunk_size:
            save_chunk()

            # Retain the last segments as context for the next chunk.
            retained = []
            retained_tokens = 0

            for item in reversed(current_segments):
                item_tokens = len(tokenizer.encode(item["text"]))
                if retained_tokens + item_tokens > overlap:
                    break
                retained.insert(0, item)
                retained_tokens += item_tokens

            current_segments = retained
            current_tokens = retained_tokens

        current_segments.append({
            "start": segment["start"],
            "end": segment["end"],
            "text": text,
        })
        current_tokens += len(tokens)

    save_chunk()
    return chunks
