# NyayaSetu

**Bridging the Gap Between Law and Understanding**

NyayaSetu is an academic prototype for understanding legal documents with Generative AI and Retrieval-Augmented Generation (RAG). It is designed to help users explore uploaded documents, review clauses, ask questions, and view explanations supported by retrieved document context.

> **Important:** NyayaSetu is an informational prototype, not a substitute for a qualified lawyer. Explanations and risk flags may be incomplete or incorrect. Do not use the application as the sole basis for legal, financial, or contractual decisions.

---

## 1. Features

- Upload PDF and DOCX documents.
- Extract text from supported documents.
- Split document text into chunks and index it for retrieval.
- Ask questions about an uploaded document and review the retrieved context.
- Generate summaries and plain-language explanations.
- Flag potentially important clauses using preliminary heuristics.
- Explore basic what-if scenarios and draft-generation features, where implemented.
- Translate text through the configured Gemini API integration, where implemented.
- Chat-style interface with an Ask mode and a What-if scenario mode, source citations, and saved conversation history.
- Overview, searchable clause browser, risk screening, and clause-conflict checks.
- Register and log in using JWT-based authentication.
- Store application records in SQLite (default) and document embeddings in ChromaDB.
- Runs locally with two commands — no Docker required.

**Limitations**
- Scanned PDFs may require OCR. Install Tesseract OCR if the project’s OCR workflow is enabled.
- Risk flags are preliminary indicators, not legal conclusions.
- Answers depend on the quality and completeness of the uploaded document and retrieved context.
- Reliable legal-source retrieval requires verified legal materials to be ingested into the application.
- Sample agreements are fictional test documents and are not real contracts.

---

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, lucide-react |
| Backend API | Python, FastAPI, Uvicorn |
| Database | SQLite by default (any SQLAlchemy URL via `DATABASE_URL`) |
| Vector store | ChromaDB (local, persistent) |
| Language model | Google Gemini API |
| Authentication | JWT |
| Document parsing | PyMuPDF, python-docx |
| Testing | pytest, HTTPX |

---

## 3. Requirements

- **Python 3.11+**
- **Node.js 18+** and npm
- A **Gemini API key** for AI-powered answers (the app still runs without one, using extractive fallbacks)
- Tesseract OCR only if you need to read scanned PDFs

---

## 4. Configure

Copy `.env.example` to `.env` in the project root and fill it in:

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
JWT_SECRET=a_long_random_secret
MAX_UPLOAD_MB=20
FRONTEND_ORIGIN=http://localhost:5173
```

Generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

The database (`backend/nyayasetu.db`), uploads (`backend/uploads/`) and vector index (`backend/chroma_data/`) are created automatically inside `backend/`. Override with `DATABASE_URL`, `UPLOAD_DIR` or `CHROMA_PERSIST_DIR` if needed.

> Never commit `.env` or share it. If a key or secret has ever been shared or committed, rotate it.

---

## 5. Run

Open **two terminals** in the project root.

**Windows (PowerShell)**

```powershell
.\start-backend.ps1
.\start-frontend.ps1
```

If PowerShell blocks scripts: `Set-ExecutionPolicy -Scope Process Bypass`.

**macOS / Linux**

```bash
./start-backend.sh
./start-frontend.sh
```

Then open **http://localhost:5173**. API docs are at http://localhost:8000/docs.

The first run creates a Python virtualenv and installs dependencies, so it takes a few minutes (ChromaDB downloads a small embedding model on first use).

Manual equivalent:

```bash
# terminal 1
cd backend && python -m venv venv && source venv/bin/activate   # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend && npm install && npm run dev
```

The dev server proxies `/api` to `http://127.0.0.1:8000`. To use another backend address, set `BACKEND_URL` before `npm run dev`; to build for hosting elsewhere, set `VITE_API_URL`.

---

## 6. Using the app

1. Create an account and sign in.
2. Drag a PDF/DOCX onto the upload box (or click it). Progress is shown while the file is uploaded, read, split into clauses and indexed.
3. **Chat** – ask questions, or switch to **What-if** to explore a scenario. Expand "sources" under an answer to see the exact passages used. Conversations are remembered per document in your browser.
4. **Overview** – structured summary. **Clauses** – searchable clause list. **Risks / Conflicts** – preliminary screening.
5. Use the moon/sun button for dark mode, and the bin icon next to a document to delete it.

AI output is assistance, not legal advice. Verify against the original document.

---

## 7. Troubleshooting

- **"Cannot reach the server"** – the backend isn't running; start `start-backend` and check its terminal for errors.
- **Answers say Gemini is not configured** – set `GEMINI_API_KEY` in `.env` and restart the backend. If requests still fail, the backend log prints the reason (invalid key, model name, quota).
- **Registration returns 500** – ensure `passlib==1.7.4` and `bcrypt==4.0.1` (pinned in `requirements.txt`) are installed in the active virtualenv.
- **Port already in use** – stop the other process, or change the port in the start script / `vite.config.ts`.
- **Reset everything** – stop both servers and delete `backend/nyayasetu.db`, `backend/uploads/` and `backend/chroma_data/`.

---

## 8. Tests

```bash
cd backend && python -m pytest
cd frontend && npm run build   # type-checks and builds
```

---

## 9. Project structure

```text
nyayasetu/
├── backend/            FastAPI app (app/), tests, requirements.txt
├── frontend/           React UI (src/components, src/api.ts, src/style.css)
├── data/               Fictional sample agreement
├── docs/               Architecture, API, RAG, evaluation notes
├── start-*.sh / .ps1   One-command launchers
└── .env.example
```

---

## 10. Privacy and security

- Upload only documents you are permitted to process; AI features send document excerpts to the Gemini API.
- Keep API keys, JWT secrets and uploaded files private; use strong secrets outside local development.
- Add proper authentication hardening, retention and access controls before any public deployment.

## 11. Disclaimer

NyayaSetu is an academic demonstration of document processing and AI-assisted retrieval. It does not provide legal advice. Consult a qualified legal professional for decisions that require it.
