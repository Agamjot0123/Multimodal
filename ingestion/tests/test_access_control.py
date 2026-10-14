
from ingestion.scripts.retrieval import add_chunks, get_relevant_chunks


def test_private_documents_are_isolated():
    # Student A indexes a private document.
    add_chunks(
        [{
            "text": "Quantum mechanics explains particle wave behavior.",
            "file_name": "student_a.pdf",
            "chunk_index": 0,
            "page_number": 1,
        }],
        owner_id="student_a",
        document_id="private_a",
    )

    # Student B indexes a different private document.
    add_chunks(
        [{
            "text": "Botany studies plants and their growth.",
            "file_name": "student_b.pdf",
            "chunk_index": 0,
            "page_number": 1,
        }],
        owner_id="student_b",
        document_id="private_b",
    )

    results_a = get_relevant_chunks(
        "quantum mechanics particles",
        user_id="student_a",
    )

    results_b = get_relevant_chunks(
        "quantum mechanics particles",
        user_id="student_b",
    )

    assert any(
        result["metadata"]["document_id"] == "private_a"
        for result in results_a
    )
    assert all(
        result["metadata"]["document_id"] != "private_b"
        for result in results_a
    )
    assert all(
        result["metadata"]["document_id"] != "private_a"
        for result in results_b
    )


def test_community_documents_require_membership():
    add_chunks(
        [{
            "text": "Linear algebra covers vectors and matrices.",
            "file_name": "shared_notes.pdf",
            "chunk_index": 0,
            "page_number": 1,
        }],
        owner_id="student_a",
        document_id="community_notes",
        access_scope="community",
        community_id="math_club",
    )

    # A student who belongs to the community can retrieve the notes.
    member_results = get_relevant_chunks(
        "linear algebra vectors matrices",
        user_id="student_b",
        community_ids=["math_club"],
    )

    assert any(
        result["metadata"]["document_id"] == "community_notes"
        for result in member_results
    )

    # A student without community access cannot retrieve the notes.
    nonmember_results = get_relevant_chunks(
        "linear algebra vectors matrices",
        user_id="student_c",
        community_ids=[],
    )

    assert all(
        result["metadata"]["document_id"] != "community_notes"
        for result in nonmember_results
    )
