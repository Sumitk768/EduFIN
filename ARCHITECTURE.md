# EduFIN: Technical Architecture & System Design Document

**Project:** EduFIN (AI-Powered Multilingual Financial Literacy Platform)  
**Phase:** Backend Architecture Specification & Environment Feasibility Analysis  
**Target Environment:** Google AI Studio (Cloud Run Container Environment)  
**Date:** August 2026  

---

## 1. Executive Summary & Environment Feasibility

EduFIN is an AI-powered multilingual financial literacy platform designed to deliver personalized financial education, conversational advisory, automated budgeting tools, and interactive quizzes across diverse linguistic and socio-economic demographics.

This document analyzes the target Google AI Studio environment, addresses key feasibility questions, evaluates the initial FastAPI/PostgreSQL proposal, and specifies the production-ready backend architecture.

---

## 2. Environment Feasibility & Core Assessment

### Q1: What server-side runtime is available?
* **Runtime:** Node.js (`v22.x`) with npm (`10.x`), TypeScript (`~5.8.x`), `tsx` (TypeScript executor for development), and `esbuild` (production bundling).
* **Network & Ingress:** The sandbox container enforces that **Port 3000 (`0.0.0.0:3000`) is the ONLY externally accessible port** behind an nginx reverse proxy layer.
* **Underlying Container:** Linux container with `python3` (3.10.12) installed in the base image, but without automated Python package/venv management tooling in the AI Studio build/preview runner.

### Q2: Can Python / FastAPI run reliably in this environment?
* **Analysis:** **No, not as the primary web service.** While the base OS has a Python interpreter, the Google AI Studio platform lifecycle (including `npm run dev`, `compile_applet`, `restart_dev_server`, package installation tools, and Cloud Run production container buildpack) is strictly engineered for a **Node.js/TypeScript** application pipeline.
* **Failure Points if using FastAPI:**
  1. AI Studio's process supervisor automatically launches `npm run dev` and monitors Node.js processes on port 3000.
  2. The CI/CD build system executes `npm run build` and starts the app via `node dist/server.cjs`.
  3. Platform package tools (`install_applet_package`) manage `package.json`, not `pip` or `poetry`.
  4. Managing independent Uvicorn processes and virtual environments leads to container lifecycle mismatches, dropped proxy routes, and build failures on Cloud Run export.
* **Architectural Decision:** Implement the backend using **TypeScript + Express (Node.js 22)**. Express provides identical high-throughput asynchronous REST API capabilities, native type safety with TypeScript, seamless Gemini SDK integration (`@google/genai`), and 100% compatibility with the AI Studio and Cloud Run deployment pipeline.

### Q3: Can PostgreSQL be connected?
* **Analysis:** **Yes, absolutely.**
* **Integration Methods:**
  1. **Direct Connection:** Connect to any managed PostgreSQL instance (Cloud SQL, Neon, Supabase, AWS RDS) using Node.js drivers (`pg`, `postgres`, `@neondatabase/serverless`) and an ORM (such as **Drizzle ORM**).
  2. **AI Studio Cloud SQL Integration:** Native provisioning via AI Studio's Cloud SQL integration using Drizzle ORM schema definitions and automated migrations.
  3. **Connection Pooling:** Connection strings (`DATABASE_URL`) with connection pooling support handle serverless/container scaling seamlessly.

### Q4: How should environment variables and secrets be handled?
* **Secret Isolation:** All secrets must be declared in `.env.example` for documentation and configured via AI Studio UI Secrets panel or container environment variables.
* **Server-Side Security:** Secrets such as `GEMINI_API_KEY`, `DATABASE_URL`, and `JWT_SECRET` are strictly accessed via `process.env.VARIABLE_NAME` in server-side code only. They must never be prefixed with `VITE_` or exposed to the client.
* **Lazy Initialization:** SDKs and database clients initialize with fallback validation to prevent server boot crashes if an environment variable is temporarily absent during configuration.

### Q5: How can the backend expose REST APIs?
* **Server Entry Point:** Express server listening on `0.0.0.0:3000` with modular routing under `/api/v1/*`.
* **Standard Middleware:**
  * `express.json()` and `express.urlencoded()` for request body parsing.
  * `cors()` for cross-origin resource sharing.
  * Request logging, rate limiting, and centralized error handling middleware.
* **Health & Readiness Endpoints:** `/api/health` and `/api/v1/status` for uptime checks and container probes.

### Q6: How can the project later be synchronized with GitHub?
* **Export Mechanism:** AI Studio provides native Git synchronization and repository export via the AI Studio Settings menu ("Export to GitHub" / "Download ZIP").
* **Portability:** The codebase adheres to standard Node.js / TypeScript project structure (`package.json`, `tsconfig.json`, `.gitignore`), allowing developers to clone, run `npm install`, and deploy anywhere (Google Cloud Run, Docker, AWS, Heroku) without proprietary dependencies.

### Q7: How can Gemini be safely called from server-side code?
* **SDK:** Use Google's official `@google/genai` TypeScript SDK (pre-installed `^2.4.0`).
* **Pattern:** Encapsulate Gemini interactions within a dedicated service layer (`server/services/gemini.service.ts`).
* **Safety & Resilience:**
  * Gemini API key is loaded server-side only via `process.env.GEMINI_API_KEY`.
  * Model parameters use strict JSON schemas (`responseSchema`) for structured outputs (e.g., structured lesson content, localized financial definitions, quiz generation, and budget breakdown).
  * System instructions enforce financial safety disclaimers (educational advice only, not certified fiduciary financial counsel).

---

## 3. Proposed Backend Architecture

```
                                  [ CLIENTS ]
                    (Future Web UI / Mobile Apps / API Consumers)
                                       │
                                       ▼ HTTPS (Port 3000)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EduFIN BACKEND SERVICE                            │
│                        (Express + TypeScript on Node 22)                    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                            MIDDLEWARE                                 │  │
│  │   • Security Headers (Helmet/CORS)    • JWT Authentication & RBAC     │  │
│  │   • Request Validation (Zod)          • Centralized Error Handling    │  │
│  │   • Rate Limiting                     • Language Context Resolver     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                          CONTROLLERS / ROUTERS                        │  │
│  │  /api/v1/auth          /api/v1/modules        /api/v1/quizzes         │  │
│  │  /api/v1/advisor       /api/v1/budget         /api/v1/translation     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────────────────────────▼───────────────────────────────────┐  │
│  │                             SERVICE LAYER                             │  │
│  │  ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────┐ │  │
│  │  │   LearningService    │ │    AdvisorService    │ │ BudgetService  │ │  │
│  │  └──────────────────────┘ └──────────────────────┘ └────────────────┘ │  │
│  │  ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────┐ │  │
│  │  │   GeminiAIService    │ │   TranslationEngine  │ │  AuthService   │ │  │
│  │  └──────────────────────┘ └──────────────────────┘ └────────────────┘ │  │
│  └──────────────────┬──────────────────────────────────┬─────────────────┘  │
│                     │                                  │                    │
│  ┌──────────────────▼─────────────┐     ┌──────────────▼─────────────────┐  │
│  │        DATA ACCESS LAYER       │     │       EXTERNAL INTEGRATION     │  │
│  │  • Drizzle ORM / PostgreSQL    │     │  • Google Gemini 2.5/ Flash    │  │
│  │  • Repositories & Migrations   │     │    (@google/genai SDK)         │  │
│  └──────────────────┬─────────────┘     └────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PERSISTENCE LAYER                                │
│                   PostgreSQL Database (Cloud SQL / Neon)                    │
│   • Users & Profiles (Languages, Level)   • Quizzes & Submissions           │
│   • Modules & Lessons                     • Budget Records & Analytics      │
│   • Chat Histories & Learning Streaks     • Multilingual Term Glossary      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Subsystem Strategies

### 4.1 Runtime & Build Strategy
* **Development:** Execution via `tsx server.ts` supporting rapid TypeScript execution and hot reload on server files.
* **Production Build:** `npm run build` compiles `server.ts` into a self-contained CommonJS bundle at `dist/server.cjs` via `esbuild` with `--packages=external` and `--platform=node`.
* **Execution:** `npm start` executes `node dist/server.cjs`.

### 4.2 Database Strategy
* **Engine:** PostgreSQL 15+.
* **ORM:** **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) for lightweight, type-safe SQL queries with zero runtime bloat.
* **Core Entities:**
  1. `users`: ID, email, password hash, preferred language (e.g., `en`, `hi`, `es`, `fr`, `bn`, `ta`, `te`), financial literacy level (Beginner, Intermediate, Advanced).
  2. `learning_modules`: ID, slug, title, category (Savings, Investment, Credit, Debt, Budgeting, Taxation, Scams/Security), difficulty.
  3. `module_translations`: Module ID, language code, localized content, terminology glossaries.
  4. `quizzes`: Quiz ID, module ID, questions, choices, explanations.
  5. `user_progress`: User ID, module ID, completion status, quiz scores, streak count.
  6. `budget_entries`: User ID, amount, category, income/expense, transaction date, currency.
  7. `advisor_conversations`: User ID, session ID, message history, detected user intent, financial topic tags.

### 4.3 AI Integration Strategy (Google Gemini)
* **SDK:** `@google/genai` (`^2.4.0`).
* **Model Selection:**
  * `gemini-2.5-flash`: Primary high-speed model for interactive multilingual Q&A, instant lesson localization, quiz generation, and real-time budgeting analysis.
  * `gemini-2.5-pro`: Complex scenario modeling (e.g., retirement simulation analysis, loan amortization reasoning).
* **Use Cases:**
  1. **Multilingual Financial Tutor:** Explains complex financial topics (compound interest, APR, inflation, mutual funds) using simplified analogies in the user's native dialect.
  2. **Personalized Quiz Generator:** Dynamically creates scenario-based comprehension checks tailored to the user's prior performance.
  3. **Financial Scam Detector & Analyzer:** Evaluates simulated financial messages/proposals and highlights red flags.
  4. **Smart Budget Categorizer:** Analyzes user transactions and suggests personalized savings optimizations.
* **Structured Output Enforcement:** Uses `responseSchema` with JSON Schema definition to guarantee typed responses from Gemini.

### 4.4 API Strategy
All endpoints adhere to standard RESTful conventions with JSON payloads:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | GET | Service liveness & database readiness check |
| `/api/v1/auth/register` | POST | Register new user with language/level preferences |
| `/api/v1/auth/login` | POST | Authenticate user and issue JWT token |
| `/api/v1/auth/me` | GET | Retrieve authenticated user profile |
| `/api/v1/modules` | GET | List available financial literacy modules |
| `/api/v1/modules/:id` | GET | Retrieve specific module with localized content |
| `/api/v1/modules/:id/quiz` | GET | Retrieve interactive comprehension quiz |
| `/api/v1/modules/:id/quiz/submit` | POST | Submit quiz answers, record score, update streaks |
| `/api/v1/advisor/chat` | POST | Multilingual financial literacy AI conversational agent |
| `/api/v1/advisor/explain-term` | POST | Generate simple native-language explanation of financial term |
| `/api/v1/budget/entries` | GET/POST | Manage income/expense records |
| `/api/v1/budget/analyze` | POST | AI analysis of spending habits & savings recommendations |
| `/api/v1/progress` | GET | Retrieve user learning progress, badges, and streaks |

### 4.5 Authentication & Security Strategy
* **Authentication:** Stateless JWT (JSON Web Tokens) passed via `Authorization: Bearer <token>` header.
* **Password Hashing:** `bcryptjs` with salt rounds (10+).
* **Input Validation:** `zod` schemas for all request bodies, query params, and URL params.
* **Rate Limiting:** IP and user-based throttling on AI endpoints to prevent quota exhaustion.
* **Safety Guardrails:** AI prompts enforce strict disclaimers clarifying that advice is strictly educational and not fiduciary financial advice.

### 4.6 Testing Strategy
* **Unit Testing:** Vitest / Jest for isolated service logic (budget calculations, progress algorithms, JWT token generation).
* **API Integration Testing:** Supertest against Express route handlers.
* **AI Mocking:** Mocking `@google/genai` client outputs in CI test suites to ensure predictable, cost-free regression testing.

### 4.7 Deployment Strategy
* **Platform:** Google Cloud Run (containerized server).
* **Process Model:** Single entry point `dist/server.cjs` listening on `0.0.0.0:3000`.
* **Production Build Command:** `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`.
* **Start Command:** `node dist/server.cjs`.

---

## 5. Known Limitations & Mitigations

| Limitation | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **No Native Python Supervisor** | Cannot execute FastAPI directly in AI Studio dev loop. | Use TypeScript/Express backend with identical REST APIs and better Gemini SDK support. |
| **Strict Single Port (3000)** | Cannot run separate backend & frontend servers simultaneously. | Host backend API routes (`/api/*`) on the single unified Express server on port 3000. |
| **HMR Disabled in AI Studio** | Live UI re-renders are suppressed during agent edits. | Dev server uses `tsx server.ts` with clean endpoint reload on code updates. |
| **Ephemeral Container Storage** | Local files are reset upon container teardown. | Persist all application state in PostgreSQL / Cloud SQL and Cloud storage. |

---

## 6. Recommended Backend Project Structure

```
.
├── ARCHITECTURE.md                  # This architecture specification
├── .env.example                     # Environment variables schema
├── metadata.json                    # AI Studio applet metadata
├── package.json                     # Node.js dependencies & build scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── server.ts                        # Express server entry point (Port 3000)
├── server/
│   ├── config/
│   │   ├── env.ts                   # Validated environment configuration
│   │   └── constants.ts             # App constants & language codes
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT authentication & user injection
│   │   ├── validate.middleware.ts   # Zod request validation wrapper
│   │   ├── error.middleware.ts      # Global error handler
│   │   └── rate-limiter.ts          # API rate limiting
│   ├── routes/
│   │   ├── index.ts                 # Main router aggregator (/api/v1)
│   │   ├── auth.routes.ts           # Authentication endpoints
│   │   ├── module.routes.ts         # Financial learning module endpoints
│   │   ├── quiz.routes.ts           # Quiz & progress endpoints
│   │   ├── advisor.routes.ts        # AI conversational advisor endpoints
│   │   └── budget.routes.ts         # Budget management & analysis endpoints
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── module.controller.ts
│   │   ├── quiz.controller.ts
│   │   ├── advisor.controller.ts
│   │   └── budget.controller.ts
│   ├── services/
│   │   ├── gemini.service.ts        # @google/genai SDK integration & prompts
│   │   ├── learning.service.ts      # Educational modules & curriculum
│   │   ├── quiz.service.ts          # Dynamic quiz generation & scoring
│   │   ├── advisor.service.ts       # Financial advisory logic & guardrails
│   │   └── budget.service.ts        # Financial analytics & budget calculations
│   ├── db/
│   │   ├── index.ts                 # Database client connection
│   │   ├── schema.ts                # Drizzle ORM schema definitions
│   │   └── seed.ts                  # Seed data for financial modules
│   └── types/
│       ├── api.types.ts             # Request/Response TypeScript interfaces
│       └── financial.types.ts       # Domain financial models & languages
```

---

## 7. Architecture Status

**ARCHITECTURE STATUS: READY**

The backend architecture for EduFIN is fully formulated, rigorously tailored to the Google AI Studio container runtime, and ready for systematic implementation.
