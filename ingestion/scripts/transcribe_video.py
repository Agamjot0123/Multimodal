import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel
# Transcripts generated from students' uploaded videos
# Generate and store them at runtime; don't commit them to Git
def transcribe_video(
    video_path: str,
    output_path: str,
    model_size: str = "base",
    language: str | None = None,
) -> dict:
    """Transcribe a video and save timestamped speech segments."""

    video = Path(video_path).resolve()
    output = Path(output_path).resolve()

    if not video.is_file():
        raise FileNotFoundError(f"Video file not found: {video}")

    if video.suffix.lower() not in {".mp4", ".mkv", ".mov", ".avi", ".webm"}:
        raise ValueError("Unsupported video format.")

    print(f"Loading Whisper model: {model_size}")

    model = WhisperModel(
        model_size,
        device="cpu",
        compute_type="int8",
    )

    print(f"Transcribing: {video.name}")

    segments, info = model.transcribe(
        str(video),
        language=language,
        beam_size=5,
        vad_filter=True,
    )

    transcript_segments = []

    for segment in segments:
        text = segment.text.strip()

        if not text:
            continue

        transcript_segments.append(
            {
                "start_time": round(segment.start, 3),
                "end_time": round(segment.end, 3),
                "text": text,
            }
        )

        print(
            f"[{segment.start:.2f}s - {segment.end:.2f}s] {text}"
        )

    result = {
        "file_name": video.name,
        "language": info.language,
        "language_probability": round(info.language_probability, 4),
        "model": model_size,
        "segments": transcript_segments,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\nTranscript saved to: {output}")
    print(f"Total segments: {len(transcript_segments)}")

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe a lecture video using faster-whisper."
    )

    parser.add_argument(
        "video",
        help="Path to the input video file",
    )

    parser.add_argument(
        "--output",
        default="ingestion/data/transcripts/transcript.json",
        help="Path for the output JSON file",
    )

    parser.add_argument(
        "--model",
        default="base",
        choices=["tiny", "base", "small", "medium"],
        help="Whisper model size; default: base",
    )

    parser.add_argument(
        "--language",
        default=None,
        help="Optional language code, e.g. en or hi. Auto-detect if omitted.",
    )

    args = parser.parse_args()

    try:
        transcribe_video(
            video_path=args.video,
            output_path=args.output,
            model_size=args.model,
            language=args.language,
        )
    except (FileNotFoundError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
