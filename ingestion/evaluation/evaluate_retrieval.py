"""Evaluate retrieval quality against a small labeled course-material set.

Run from the repository root:

    python -m ingestion.evaluation.evaluate_retrieval

The evaluator indexes only temporary records with an ``eval-`` prefix and
removes them in a finally block, so it does not leave benchmark data in the
persistent Chroma collection.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from ingestion.scripts.retrieval import (
    add_chunks,
    delete_document_chunks,
    get_relevant_chunks,
)

DEFAULT_DATASET = Path(__file__).with_name("test_set.json")
EVALUATION_OWNER = "evaluation-owner"

EVALUATION_CHUNKS = [
    {
        "document_id": "eval-gradient-descent",
        "owner_id": EVALUATION_OWNER,
        "file_name": "gradient_descent.pdf",
        "page_number": 12,
        "chunk_index": 0,
        "text": (
            "Gradient descent updates model parameters by moving them in the "
            "opposite direction of the gradient, scaled by the learning rate."
        ),
    },
    {
        "document_id": "eval-backprop-video",
        "owner_id": EVALUATION_OWNER,
        "file_name": "backpropagation.mp4",
        "start_time": 135.0,
        "end_time": 172.0,
        "chunk_index": 0,
        "text": (
            "The chain rule in backpropagation combines local derivatives "
            "with upstream gradients to compute parameter gradients."
        ),
    },
    {
        "document_id": "eval-linear-algebra",
        "owner_id": "evaluation-uploader",
        "file_name": "linear_algebra_notes.pdf",
        "page_number": 4,
        "chunk_index": 0,
        "text": (
            "Vectors represent quantities with magnitude and direction, while "
            "matrices represent linear transformations and organized values."
        ),
        "access_scope": "community",
        "community_id": "eval-math-community",
    },
    {
        "document_id": "eval-private-photosynthesis",
        "owner_id": "evaluation-private-owner",
        "file_name": "photosynthesis.pdf",
        "page_number": 3,
        "chunk_index": 0,
        "text": (
            "Photosynthesis allows green plants to convert light energy into "
            "chemical energy."
        ),
    },
]


def load_dataset(path: Path = DEFAULT_DATASET) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as file:
        dataset = json.load(file)
    if not isinstance(dataset, list) or not dataset:
        raise ValueError("Evaluation dataset must be a non-empty JSON list.")
    return dataset


def _source_matches(metadata: dict[str, Any], expected: dict[str, Any]) -> bool:
    return (
        metadata.get("file_name") == expected.get("file_name")
        and metadata.get("page_number") == expected.get("page_number")
        and metadata.get("start_time") == expected.get("start_time")
        and metadata.get("end_time") == expected.get("end_time")
    )


def _evaluate_case(case: dict[str, Any], top_k: int) -> dict[str, Any]:
    results = get_relevant_chunks(
        case["query"],
        user_id=case["user_id"],
        community_ids=case.get("community_ids", []),
        top_k=top_k,
    )
    retrieved_ids = [
        result["metadata"].get("document_id")
        for result in results
    ]
    expected_ids = set(case.get("expected_document_ids", []))
    first_match_rank = next(
        (
            rank
            for rank, document_id in enumerate(retrieved_ids, start=1)
            if document_id in expected_ids
        ),
        None,
    )
    source_preserved = any(
        _source_matches(result["metadata"], expected_source)
        for result in results
        for expected_source in case.get("expected_sources", [])
    )
    unauthorized_ids = set(case.get("forbidden_document_ids", []))

    return {
        "id": case["id"],
        "answerable": case["answerable"],
        "retrieved_document_ids": retrieved_ids,
        "hit": first_match_rank is not None,
        "reciprocal_rank": 1 / first_match_rank if first_match_rank else 0.0,
        "source_preserved": source_preserved if case["answerable"] else True,
        "unauthorized_retrieved": bool(unauthorized_ids.intersection(retrieved_ids)),
    }


def evaluate(
    dataset: list[dict[str, Any]],
    *,
    top_k: int = 5,
) -> dict[str, Any]:
    """Index the fixture corpus, calculate retrieval metrics, and clean up."""
    document_ids = {
        chunk["document_id"]
        for chunk in EVALUATION_CHUNKS
    }
    try:
        for chunk in EVALUATION_CHUNKS:
            indexed = dict(chunk)
            owner_id = indexed.pop("owner_id")
            document_id = indexed.pop("document_id")
            add_chunks(
                [indexed],
                owner_id=owner_id,
                document_id=document_id,
                access_scope=indexed.pop("access_scope", "private"),
                community_id=indexed.pop("community_id", None),
            )

        cases = [_evaluate_case(case, top_k) for case in dataset]
    finally:
        for document_id in document_ids:
            delete_document_chunks(document_id)

    answerable_cases = [case for case in cases if case["answerable"]]
    refusal_cases = [case for case in cases if not case["answerable"]]
    total = len(answerable_cases)
    return {
        "cases": len(cases),
        "answerable_cases": total,
        "recall_at_k": (
            sum(case["hit"] for case in answerable_cases) / total
            if total else 0.0
        ),
        "mrr": (
            sum(case["reciprocal_rank"] for case in answerable_cases) / total
            if total else 0.0
        ),
        "source_metadata_accuracy": (
            sum(case["source_preserved"] for case in answerable_cases) / total
            if total else 0.0
        ),
        "unsupported_queries_with_context": sum(
            bool(case["retrieved_document_ids"]) for case in refusal_cases
        ),
        "unsupported_query_cases": len(refusal_cases),
        "unauthorized_retrievals": sum(
            case["unauthorized_retrieved"] for case in cases
        ),
        "details": cases,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()
    if args.top_k <= 0:
        parser.error("--top-k must be greater than zero")

    report = evaluate(load_dataset(args.dataset), top_k=args.top_k)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
