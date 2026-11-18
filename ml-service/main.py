"""Optional ML/NLP microservice for AI Developer OS.

Endpoints
  POST /embed    {texts: [str]}  -> {embeddings: [[float]]}   sentence-transformers (dense retrieval for RAG)
  POST /analyze  {text: str}     -> sentiment (DistilBERT), keywords (TF-IDF), readability
  GET  /health

Run locally:  pip install -r requirements.txt && uvicorn main:app --port 8000
Deploy on Render / Railway / Fly.io / Hugging Face Spaces, then set ML_SERVICE_URL in the Node app.
"""
import os, re, secrets
from functools import lru_cache
from typing import List

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="AI Developer OS ML service")
API_KEY = os.getenv("ML_SERVICE_KEY", "")
EMBED_MODEL = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "distilbert-base-uncased-finetuned-sst-2-english")


def check(key: str):
    if API_KEY and not secrets.compare_digest(key.encode(), API_KEY.encode()):
        raise HTTPException(status_code=401, detail="invalid api key")


@lru_cache(maxsize=1)
def embedder():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(EMBED_MODEL)


@lru_cache(maxsize=1)
def sentiment_pipe():
    from transformers import pipeline
    return pipeline("sentiment-analysis", model=SENTIMENT_MODEL)


class EmbedIn(BaseModel):
    # Bounded so one request cannot exhaust memory.
    texts: List[str] = Field(max_length=128)


class AnalyzeIn(BaseModel):
    text: str = Field(max_length=40000)


@app.get("/health")
def health():
    return {"ok": True, "embed_model": EMBED_MODEL, "sentiment_model": SENTIMENT_MODEL}


@app.post("/embed")
def embed(body: EmbedIn, x_api_key: str = Header(default="")):
    check(x_api_key)
    vecs = embedder().encode([t[:4000] for t in body.texts], normalize_embeddings=True, show_progress_bar=False)
    return {"embeddings": [[round(float(x), 5) for x in v] for v in vecs]}


@app.post("/analyze")
def analyze(body: AnalyzeIn, x_api_key: str = Header(default="")):
    check(x_api_key)
    text = body.text[:20000]
    words = re.findall(r"\S+", text)
    # Transformer sentiment on the first ~450 words (model limit is 512 tokens).
    res = sentiment_pipe()(" ".join(words[:450]))[0]
    label = res["label"].lower()
    score = float(res["score"]) * (1 if label == "positive" else -1)
    # Keywords via TF-IDF over sentences.
    from sklearn.feature_extraction.text import TfidfVectorizer
    sents = [s for s in re.split(r"(?<=[.!?])\s+|\n+", text) if len(s.split()) > 2] or [text]
    vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=500)
    try:
        m = vec.fit_transform(sents)
        weights = m.sum(axis=0).A1
        terms = vec.get_feature_names_out()
        keywords = [terms[i] for i in weights.argsort()[::-1][:8]]
    except ValueError:
        keywords = []
    return {
        "source": "ml-service",
        "sentiment": {"label": label, "score": round(score, 3)},
        "keywords": keywords,
        "words": len(words),
        "readingMinutes": max(1, round(len(words) / 220)),
    }
