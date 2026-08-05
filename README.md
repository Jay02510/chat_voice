# 🎤 VODABI AI Outbound Sales Call Evaluation & Admin Backoffice Platform

VODABI is an enterprise AI-powered voice roleplay evaluation platform designed to replace initial manual phone interviews for outbound sales telemarketing candidates.

---

## 🌟 Key Features

- **🎙️ WebRTC Realtime Voice Engine**: Sub-200ms latency continuous voice call roleplay powered by OpenAI's `gpt-4o-realtime-preview` model with automatic server Voice Activity Detection (VAD) and turn interruption handling.
- **🔐 Role-Based Access Control (RBAC)**: Fine-grained permissions for `SUPER_ADMIN`, `ADMIN`, and `MANAGER` roles.
- **🔗 Candidate Magic Links**: Secure `magicToken` generation allowing job candidates to complete voice roleplay tests without creating accounts.
- **📊 Itemized Rubric Evaluation Engine**: Automated scoring against 11 itemized criteria codes (`BS001-BS002`, `E0001-E0004`, `MC001-MC005`), BANTCQ matrix evidence, speech WPM telemetry, and customized 2-week onboarding roadmaps.
- **💬 VOISOR AI Coaching Assistant**: Embedded chatbot widget providing hiring managers with interactive, AI-driven coaching advice tailored to candidate performance reports.
- **⚙️ Dynamic Admin Backoffice**: Comprehensive administration tools for managing difficulty tiers (`초급`, `중급`, `고급`), editing system prompts & guardrails, customizing criteria weights, and updating scenario script templates.

---

## 🏗️ Architecture Stack

- **Frontend**: React 18, Vite, TypeScript, WebRTC API, Socket.IO Client, Vanilla CSS Modern Glassmorphic Theme.
- **Backend**: NestJS, WebSockets, Prisma ORM (MariaDB Driver Adapter), Passport JWT, RolesGuard.
- **AI Services**: OpenAI Realtime API (`gpt-4o-realtime-preview-2024-12-17`), `whisper-1`, `gpt-4o`, `tts-1`.
- **Database**: MariaDB / MySQL.
- **Reverse Proxy**: Nginx container handling static assets, REST proxy (`/api/*`), and WebSockets (`/socket.io/*`).

---

## 🚀 Quick Start (Docker Compose)

### 1. Environment Setup
Create a `.env` file in the root directory:

```env
OPENAI_API_KEY="sk-proj-your-openai-api-key"
DATABASE_URL="mysql://root:rootpassword@localhost:3306/chat_voice"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef"
```

### 2. Launch Platform

```bash
docker compose up --build -d
```

Access the application in your browser at:
**[http://localhost](http://localhost)**

---

## 🔑 Default Credentials

- **Super Admin**: `admin@vodabi.com` / `Vodabi@2024!`
- **Role**: `SUPER_ADMIN`

---

## 📖 Complete Documentation

For detailed PRD, TDD, User Flow Diagrams, and API Specifications, refer to:
[vodabi_system_documentation.md](file:///Users/jasonbenjamin/.gemini/antigravity-ide/brain/f7b397c2-367c-4ba5-8a9b-ab16776a2804/vodabi_system_documentation.md)
