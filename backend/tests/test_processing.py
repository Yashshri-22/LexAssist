from app.processing import segment
def test_segments_numbered_clauses():
    out=segment("1. Termination\nEither party may terminate.\n2. Payment\nPayment is due monthly.")
    assert len(out)==2
    assert out[0]["clause_number"]=="1."
