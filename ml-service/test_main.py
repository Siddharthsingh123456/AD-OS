"""Tests for the ML service. The heavy models are replaced with fakes so these run in seconds without downloads."""
import importlib

import pytest
from fastapi.testclient import TestClient


class FakeEmbedder:
    def encode(self, texts, normalize_embeddings=True, show_progress_bar=False):
        return [[float(len(t)), 1.0, 0.5] for t in texts]


def fake_sentiment(_text):
    return [{"label": "POSITIVE", "score": 0.93}]


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("ML_SERVICE_KEY", raising=False)
    import main

    importlib.reload(main)
    monkeypatch.setattr(main, "embedder", lambda: FakeEmbedder())
    monkeypatch.setattr(main, "sentiment_pipe", lambda: fake_sentiment)
    return TestClient(main.app)


def test_health_reports_models(client):
    body = client.get("/health").json()
    assert body["ok"] is True
    assert "embed_model" in body


def test_embed_returns_one_vector_per_text(client):
    r = client.post("/embed", json={"texts": ["hello", "hi"]})
    assert r.status_code == 200
    vecs = r.json()["embeddings"]
    assert len(vecs) == 2 and vecs[0][0] == 5.0


def test_embed_rejects_oversized_batches(client):
    r = client.post("/embed", json={"texts": ["x"] * 129})
    assert r.status_code == 422


def test_analyze_returns_sentiment_keywords_and_reading_time(client):
    text = "The new release is fast and reliable. Retrieval quality improved a lot. Users love the faster search."
    r = client.post("/analyze", json={"text": text})
    assert r.status_code == 200
    body = r.json()
    assert body["sentiment"] == {"label": "positive", "score": 0.93}
    assert body["words"] > 10 and body["readingMinutes"] == 1
    assert isinstance(body["keywords"], list) and body["keywords"]


def test_negative_sentiment_gets_a_negative_score(client, monkeypatch):
    import main

    monkeypatch.setattr(main, "sentiment_pipe", lambda: (lambda _t: [{"label": "NEGATIVE", "score": 0.8}]))
    body = client.post("/analyze", json={"text": "This is broken and slow today."}).json()
    assert body["sentiment"]["score"] == -0.8


def test_api_key_is_enforced_when_configured(monkeypatch):
    monkeypatch.setenv("ML_SERVICE_KEY", "s3cret")
    import main

    importlib.reload(main)
    monkeypatch.setattr(main, "embedder", lambda: FakeEmbedder())
    c = TestClient(main.app)
    assert c.post("/embed", json={"texts": ["a"]}).status_code == 401
    assert c.post("/embed", json={"texts": ["a"]}, headers={"x-api-key": "wrong"}).status_code == 401
    assert c.post("/embed", json={"texts": ["a"]}, headers={"x-api-key": "s3cret"}).status_code == 200
