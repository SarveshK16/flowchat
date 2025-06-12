# FlowChat 🧠💬

A full-stack AI-powered chat application built using Django REST Framework (DRF) for the backend and React (Vite + Tailwind) for the frontend. Users can authenticate, create chat threads, talk to LLMs, and manage chat history — all through a clean, modern UI.

## ✨ Features

### ✅ Authentication
- JWT-based login and signup
- Token-based session handling

### 💬 Chat Functionality
- Send messages to AI models (e.g., Gemini, GPT-4)
- Receive generated responses from selected LLM
- Support for multiple threads per user
- Auto generated thread title based on chat context
- Message history view and thread switching
- Delete threads

### 🧠 Model Control
- Choose which LLM model to chat with (frontend dropdown selector)
- Dynamic routing of chat messages to the selected model from the backend

### 🎨 Frontend (Vite + React + Tailwind)
- Dark/light mode toggle
- Chat UI mimics modern chat apps (inspired by t3.chat)
- Responsive design with sidebar for threads and chat area

---

## 🧱 Project Structure

```bash

flowchat/
├── backend/
│ ├── chat/ # Django app for chat logic
│ ├── users/ # Django app for auth
│ ├── core/ # Project settings
│ ├── manage.py/ # manage file
│ ├── .env # API keys and secret configs
│ └── db.sqlite3 # Default DB (or use PostgreSQL)
│
├── frontend/
│ ├── src/
│ │ ├── Main.jsx # Main App
│ │ └── App.jsx # UI components
│ └── index.html # Root HTML
│
└── README.md # You're here
```

## ⚙️ Installation

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Create a .env file
touch .env
# Add your OpenAI/Gemini API keys and secret settings

# Migrate and run
python manage.py migrate
python manage.py runserver

```
### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
The frontend will run on http://localhost:5173, and the backend will run on http://localhost:8000.

## 🔐 API Overview

All endpoints (apart from signup/) require JWT token in the Authorization header (format: Bearer <token>).

### Auth
- POST /api/signup/ — Sign up
- POST /api/login/ — Log in (returns JWT)

### Chat
- POST /api/chat/ — Send a message (requires message, model, thread_id)
- GET /api/chat/ — Get all chat history for the user

### Threads
- GET /api/threads/ — List threads
- GET /api/threads/<id>/messages/ — Get messages in a thread
- DELETE /api/threads/<id>/ — Delete a thread

## 🔧 Environment Variables

Your .env file in the backend/ directory should include:

```bash
GOOGLE_API_KEY = your-gemini-key
OPENAI_API_KEY = your-openai-key
```

## 🧠 Credits

Built by Sarvesh as a side project to explore AI tooling with modern full-stack tech.

## 📄 License

MIT License


