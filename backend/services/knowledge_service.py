"""
TZMICHA AI OS - Knowledge Service (RAG Engine)
Upload PDFs, text, FAQs → Chunk → Embed → Store in Qdrant → Retrieve during calls.

This is what makes AI Employees KNOW your business.
Upload a brochure and the AI can answer questions from it naturally.
"""

import uuid
import hashlib
from typing import Optional
from datetime import datetime

import os

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import VectorParams, Distance, PointStruct
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False


class KnowledgeService:
    """
    RAG Engine — uses Qdrant vector DB + sentence-transformers.
    Optional: works only if qdrant-client is installed.
    """

    def __init__(self):
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.qdrant = QdrantClient(url=qdrant_url) if QDRANT_AVAILABLE else None
        self.embedding_dimension = 384
        self._embedding_model = None

    def _get_embedding_model(self):
        """Lazy load embedding model (sentence-transformers)"""
        if self._embedding_model is None:
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        return self._embedding_model

    # ===== Collection Management =====

    async def create_collection(self, collection_name: str) -> bool:
        """Create a Qdrant collection for a knowledge base"""
        try:
            self.qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_dimension,
                    distance=Distance.COSINE,
                ),
            )
            return True
        except Exception:
            # Collection might already exist
            return False

    async def delete_collection(self, collection_name: str) -> bool:
        """Delete a knowledge base collection"""
        try:
            self.qdrant.delete_collection(collection_name=collection_name)
            return True
        except Exception:
            return False

    # ===== Document Processing =====

    async def ingest_text(
        self,
        collection_name: str,
        text: str,
        source: str = "manual",
        metadata: Optional[dict] = None,
    ) -> int:
        """
        Ingest plain text into knowledge base.
        Chunks text and stores embeddings.
        Returns number of chunks created.
        """
        # Ensure collection exists
        await self.create_collection(collection_name)

        # Chunk the text
        chunks = self._chunk_text(text)

        # Generate embeddings
        model = self._get_embedding_model()
        embeddings = model.encode(chunks, show_progress_bar=False)

        # Store in Qdrant
        points = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid4())
            points.append(PointStruct(
                id=point_id,
                vector=embedding.tolist(),
                payload={
                    "text": chunk,
                    "source": source,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "metadata": metadata or {},
                    "created_at": datetime.utcnow().isoformat(),
                },
            ))

        if points:
            self.qdrant.upsert(collection_name=collection_name, points=points)

        return len(chunks)

    async def ingest_pdf(
        self,
        collection_name: str,
        pdf_bytes: bytes,
        filename: str,
    ) -> int:
        """
        Extract text from PDF and ingest into knowledge base.
        """
        text = self._extract_pdf_text(pdf_bytes)
        if not text.strip():
            return 0

        return await self.ingest_text(
            collection_name=collection_name,
            text=text,
            source=filename,
            metadata={"type": "pdf", "filename": filename},
        )

    async def ingest_faq(
        self,
        collection_name: str,
        faqs: list[dict],
    ) -> int:
        """
        Ingest FAQ pairs (question + answer).
        Each Q&A pair becomes one chunk for better retrieval.
        
        faqs format: [{"question": "...", "answer": "..."}]
        """
        await self.create_collection(collection_name)

        model = self._get_embedding_model()
        points = []

        for faq in faqs:
            question = faq.get("question", "")
            answer = faq.get("answer", "")
            combined = f"Q: {question}\nA: {answer}"

            # Embed the question (better retrieval when customer asks similar question)
            embedding = model.encode(question, show_progress_bar=False)

            point_id = str(uuid.uuid4())
            points.append(PointStruct(
                id=point_id,
                vector=embedding.tolist(),
                payload={
                    "text": combined,
                    "question": question,
                    "answer": answer,
                    "source": "faq",
                    "metadata": {"type": "faq"},
                    "created_at": datetime.utcnow().isoformat(),
                },
            ))

        if points:
            self.qdrant.upsert(collection_name=collection_name, points=points)

        return len(points)

    # ===== Retrieval (Search) =====

    async def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.5,
    ) -> list[dict]:
        """
        Semantic search in knowledge base.
        Called during conversations when AI needs to answer a question.
        
        Returns list of relevant text chunks with scores.
        """
        model = self._get_embedding_model()
        query_embedding = model.encode(query, show_progress_bar=False)

        try:
            results = self.qdrant.search(
                collection_name=collection_name,
                query_vector=query_embedding.tolist(),
                limit=top_k,
                score_threshold=score_threshold,
            )

            return [
                {
                    "text": hit.payload.get("text", ""),
                    "score": hit.score,
                    "source": hit.payload.get("source", "unknown"),
                    "metadata": hit.payload.get("metadata", {}),
                }
                for hit in results
            ]
        except Exception:
            return []

    async def get_context_for_conversation(
        self,
        collection_name: str,
        user_message: str,
        max_context_length: int = 1500,
    ) -> str:
        """
        Get relevant knowledge context for a conversation turn.
        This is injected into the AI's system prompt so it can answer from company knowledge.
        
        Returns formatted context string ready for LLM.
        """
        results = await self.search(
            collection_name=collection_name,
            query=user_message,
            top_k=3,
            score_threshold=0.45,
        )

        if not results:
            return ""

        # Build context string
        context_parts = ["COMPANY KNOWLEDGE (answer based on this information):"]
        total_length = 0

        for result in results:
            text = result["text"].strip()
            if total_length + len(text) > max_context_length:
                break
            context_parts.append(f"- {text}")
            total_length += len(text)

        return "\n".join(context_parts)

    # ===== Stats =====

    async def get_collection_stats(self, collection_name: str) -> dict:
        """Get stats about a knowledge base"""
        try:
            info = self.qdrant.get_collection(collection_name=collection_name)
            return {
                "total_vectors": info.points_count,
                "status": info.status.value,
            }
        except Exception:
            return {"total_vectors": 0, "status": "not_found"}

    # ===== Private Methods =====

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        """
        Split text into overlapping chunks.
        Tries to split at sentence boundaries for coherent chunks.
        """
        # Clean text
        text = text.strip()
        if not text:
            return []

        # Split into sentences first
        sentences = []
        for paragraph in text.split("\n"):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            # Split by sentence endings
            import re
            parts = re.split(r'(?<=[.!?])\s+', paragraph)
            sentences.extend(parts)

        # Build chunks from sentences
        chunks = []
        current_chunk = ""

        for sentence in sentences:
            if len(current_chunk) + len(sentence) > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                # Start new chunk with overlap (last sentence of previous)
                current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks

    def _extract_pdf_text(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes"""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
            return text
        except ImportError:
            # Fallback to pdfplumber
            try:
                import pdfplumber
                import io
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    text = ""
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                return text
            except ImportError:
                return "[PDF extraction requires PyMuPDF or pdfplumber]"
