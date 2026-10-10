# Multimodal AI Tutor - Backend API Specifications

Base URL (Production): `https://multimodal-tutor-backend.onrender.com`  
Base URL (Local): `http://127.0.0.1:8000`

---

## Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check & API key configuration status |
| `POST` | `/api/chat` | Synchronous RAG chat response with verified citations |
| `POST` | `/api/chat/stream` | Server-Sent Events (SSE) word-by-word streaming response |
| `POST` | `/api/quiz` | Dynamic grounded multiple-choice quiz generator |

---

## 1. Health Check
Checks backend operational status and presence of required API keys.

* **URL:** `/`
* **Method:** `GET`

### Response Example (`200 OK`)
```json
{
  "status": "online",
  "groq_key_configured": true,
  "gemini_key_configured": true
}