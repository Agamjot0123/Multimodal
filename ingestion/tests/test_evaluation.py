from ingestion.evaluation.evaluate_retrieval import evaluate, load_dataset


def test_retrieval_evaluation_reports_grounding_and_isolation_metrics():
    report = evaluate(load_dataset())

    assert report["cases"] == 4
    assert report["answerable_cases"] == 3
    assert report["recall_at_k"] == 1.0
    assert report["source_metadata_accuracy"] == 1.0
    assert report["unauthorized_retrievals"] == 0
    assert report["unsupported_query_cases"] == 1
