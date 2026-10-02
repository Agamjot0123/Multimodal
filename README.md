# Multimodal AI Study Companion (Track D) 🎓

An interactive AI-powered study companion that ingests lecture videos, textbooks, and slides into a source-cited knowledge base to run adaptive assessments and personalized tutoring.

## 🚀 Key Features
- **Source-Cited Grounding:** Every AI answer includes exact timestamp and slide citations.
- **Deep-Linked Video Player:** Click any citation to jump directly to the exact video frame or slide page.
- **Adaptive Knowledge Tracing:** Bayesian Knowledge Tracing (BKT) dynamically adjusts quiz difficulty based on student mastery.

## 🛠️ Tech Stack
- **Frontend:** Next.js, Tailwind CSS, Video.js, react-pdf, Recharts
- **Backend:** FastAPI, Python, Pydantic
- **AI/ML:** Groq API (Llama 3), ChromaDB/Qdrant, `faster-whisper`, `sentence-transformers`
#Structure for the Repo

multimodal/
├── backend/                  # FastAPI Application (Member 2 & Member 1)
│   ├── app/
│   │   ├── api/              # API endpoints (/chat, /quiz, /mastery)
│   │   ├── core/             # Config, LLM client (Groq/Gemini), prompts
│   │   ├── services/         # BKT adaptive engine, citation guardrails
│   │   └── main.py           # FastAPI entry point
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile
├── frontend/                 # Next.js Application (Member 3)
│   ├── src/
│   │   ├── components/       # Video Player, PDF Canvas, Chat UI, Radar Charts
│   │   ├── app/              # Next.js App Router pages
│   │   └── lib/              # API fetchers, SSE streaming handlers
│   ├── package.json
│   └── next.config.js
├── ingestion/                # Data Processing Pipeline (Member 1)
│   ├── scripts/              # PDF parsers, Whisper transcription scripts
│   ├── data/                 # Sample raw lecture videos, slides, PDFs
│   └── ingest.py             # CLI batch ingestion runner
├── docs/                     # Submission Diagrams & Architecture Assets
│   └── system_architecture.png
├── .gitignore
├── docker-compose.yml        # Optional: Runs frontend & backend together locally
└── README.md                 # Official Documentation & Setup Guide


## 🏁 Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
http://127.0.0.1:8000/docs