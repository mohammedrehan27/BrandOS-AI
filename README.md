# BrandOS AI — Enterprise Brand Governance & Regulatory Compliance Platform

<p align="center">
  <img src="public/brandos-emblem.png" alt="BrandOS AI Logo" width="100" />
</p>

<p align="center">
  <strong>Every claim verified. Every brand protected.</strong><br />
  Automated brand compliance, regulatory guardrails, and verifiable evidence-grounded copy review for enterprise marketing teams.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/React-19.3-61DAFB?style=flat&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-5.3-000000?style=flat&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Google_Gemini-3.8_Flash-4285F4?style=flat&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL_%26_RLS-3ECF8E?style=flat&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tests-51_Passed-brightgreen?style=flat&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat" alt="License" />
</p>

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. The Enterprise Challenge & Solution](#2-the-enterprise-challenge--solution)
- [3. End-to-End System Architecture](#3-end-to-end-system-architecture)
- [4. Core Technical Capabilities](#4-core-technical-capabilities)
  - [A. Page-Aware PDF Guideline Ingestion](#a-page-aware-pdf-guideline-ingestion)
  - [B. Dense Vector & Semantic Retrieval Pipeline (RAG)](#b-dense-vector--semantic-retrieval-pipeline-rag)
  - [C. Hallucination-Proof Evidence Grounding](#c-hallucination-proof-evidence-grounding)
  - [D. Multi-Persona Governance State Machine](#d-multi-persona-governance-state-machine)
  - [E. One-Click Interactive Correction Diff Engine](#e-one-click-interactive-correction-diff-engine)
  - [F. Tamper-Evident Immutable Audit Ledger](#f-tamper-evident-immutable-audit-ledger)
  - [G. Multi-Tenant Row Level Security (RLS)](#g-multi-tenant-row-level-security-rls)
- [5. Technology Stack](#5-technology-stack)
- [6. Feature Capability Matrix (Dev vs. Production)](#6-feature-capability-matrix-dev-vs-production)
- [7. REST API Endpoints Specification](#7-rest-api-endpoints-specification)
- [8. Relational Database Schema](#8-relational-database-schema)
- [9. Quick Start Guide](#9-quick-start-guide)
- [10. Production Deployment Guide](#10-production-deployment-guide)
  - [Option A: Unified Container (Docker / Cloud Run / Render)](#option-a-unified-container-docker--cloud-run--render)
  - [Option B: Decoupled (Vercel Frontend + Render Backend)](#option-b-decoupled-vercel-frontend--render-backend)
- [11. Environment Configuration Dictionary](#11-environment-configuration-dictionary)
- [12. Testing & Quality Assurance](#12-testing--quality-assurance)

---

## 1. Executive Summary

**BrandOS AI** is an enterprise-grade AI brand governance and regulatory compliance copilot. It protects global organizations from legal liabilities, misleading claims, and brand erosion by evaluating copy (advertisements, social media posts, packaging copy, landing pages, and press releases) directly against formal brand guidelines, legal frameworks, and regulatory manuals (such as FTC, FDA, SEC, and ESG standards).

Unlike black-box AI tools, BrandOS AI is architected around **strict evidence grounding**: every identified issue is cited with page-numbered, verbatim source text from corporate guidelines. The platform keeps human reviewers in complete control through an auditable approval lifecycle and an immutable cryptographic audit ledger.

---

## 2. The Enterprise Challenge & Solution

### The Challenge
1. **Proliferation of Marketing Content:** High-velocity content teams produce hundreds of assets across multiple channels weekly.
2. **Hidden Regulatory Risks:** 60+ page guideline PDFs contain critical constraints (e.g., prohibited superlatives, mandatory disclaimers, FDA disease claims, ESG carbon claims) that humans inevitably overlook.
3. **Severe Penalties:** Misleading health claims or unsubstantiated environmental promises trigger FTC/FDA enforcement actions, multimillion-dollar class action lawsuits, and brand crises.
4. **AI Hallucinations in Conventional LLMs:** Generic LLMs invent guidelines, hallucinate policies, or fail to reference exact corporate rules.

### The BrandOS AI Solution
- **Deterministic RAG Retrieval:** Ingests official PDF guidelines, generates 3072-dimensional embeddings via `gemini-embedding-001`, and retrieves targeted rule candidates.
- **Structured Reasoning:** Uses Google Gemini 3.8 Flash (`gemini-3.8-flash`) with constrained Zod JSON schemas to identify exact character offsets for each claim.
- **Evidence Verification Guardrails:** Re-validates citations against original document text before findings reach human reviewers. Unsubstantiated claims are flagged as `needs_verification`.
- **Role-Based Workflow:** Creators draft and iterate; Reviewers audit citations and make decisions; Brand Managers maintain guidelines and oversee analytics.

---

## 3. End-to-End System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               BRANDOS AI CLIENT (React 19 SPA)                         │
│   • Executive Overview   • Brand Knowledge Base   • Review Playground   • Review Queue │
│   • Interactive Diffs    • Immutable Audit Trail  • Governance Analytics • RBAC Switch │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / REST / JSON
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                             BRANDOS API SERVER (Express 5.3)                           │
│  Auth Middleware • Workspace Tenant Guard • Multer Uploads • Central Error Dispatcher  │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│             RAG & COMPLIANCE PIPELINE     │            GOVERNANCE CORE                 │
│  ┌──────────────────────────────────────┐ │  ┌───────────────────────────────────────┐ │
│  │ 1. PDF Extractor (Page-Aware)        │ │  │ 5. Review State Machine               │ │
│  │ 2. Semantic Chunker & Keyword Engine │ │  │ 6. Role-Based Approval Enforcer       │ │
│  │ 3. Hybrid Token / Vector Ranker      │ │  │ 7. Suggestion Patch Diff Engine       │ │
│  │ 4. Ground-Truth Evidence Validator   │ │  │ 8. Immutable Audit Trail Ledger       │ │
│  └──────────────────┬───────────────────┘ │  └───────────────────┬───────────────────┘ │
└─────────────────────┼─────────────────────┴──────────────────────┼─────────────────────┘
                      │                                            │
        ┌─────────────▼──────────────┐              ┌──────────────▼─────────────┐
        │   GOOGLE GEMINI AI ENGINE  │              │   SUPABASE POSTGRES + RLS  │
        │ • @google/genai SDK        │              │ • Workspaces & Profiles    │
        │ • gemini-3.8-flash (Model) │              │ • Guidelines & Sections    │
        │ • gemini-embedding-001     │              │ • Reviews, Findings & Logs │
        │ • Structured JSON Schemas  │              │ • Supabase Storage Buckets │
        └────────────────────────────┘              └────────────────────────────┘
```

---

## 4. Core Technical Capabilities

### A. Page-Aware PDF Guideline Ingestion
The document processing engine in `server/services/pdf/extractor.ts` and `server/services/rag/chunker.ts` extracts raw text while tracking physical PDF page numbers, layout headers, and section boundaries:
- **Heuristic Heading Detection:** Identifies section headers (e.g., `RULE 3.1:`, `SECTION 4:`, `MANDATORY DISCLAIMERS:`).
- **Rule Count Heuristics:** Counts explicit compliance mandates per page using regex rule identifiers (`RULE`, `SECTION`, `POLICY`, `PROHIBITED`).
- **Stop-Word Filtered Keyword Indexing:** Generates frequency-weighted keyword tokens per section for high-speed lexical candidate retrieval.
- **Fail-Safe Processing:** Gracefully flags scanned or image-only PDFs with explicit OCR requirements rather than producing empty hallucinated sections.

### B. Dense Vector & Semantic Retrieval Pipeline (RAG)
Guideline sections are indexed and retrieved using a hybrid pipeline:
1. **Lexical Matching:** Fast token intersection against draft content.
2. **Dense Semantic Embeddings:** In production, passages and drafts are converted into 3072-dimensional vector representations via `gemini-embedding-001`.
3. **Cosine Similarity Scoring:** Matches drafts to candidate guideline passages with mathematically normalized dot products.

### C. Hallucination-Proof Evidence Grounding
In `server/services/rag/evidenceValidator.ts`, findings generated by the LLM pass through an automated verification barrier before being accepted:
- **Verbatim Passage Match:** Checks if the quoted text exists as an exact substring within the source guideline document.
- **Relevance Score Calculation:** Computes the word overlap between the draft's claim and the guideline text.
- **Automatic Downgrade Guardrail:** If an AI finding cites non-existent text or scores below the `MIN_CLAIM_EVIDENCE_RELEVANCE` threshold (60%), the status is automatically flipped to `needs_verification` with an explicit reason (`Citation passage could not be verified verbatim`).

### D. Multi-Persona Governance State Machine
Reviews follow a finite state machine implemented in `server/services/governance/stateMachine.ts`:

```
               [ Draft Copy Submitted ]
                          │
                          ▼
                     ┌─────────┐
                     │ PENDING │
                     └────┬────┘
                          │ (RAG Pipeline Execution)
                          ▼
                   ┌─────────────┐
                   │ IN_PROGRESS │
                   └──────┬──────┘
                          │ (Findings & Evidence Generated)
                          ▼
                ┌────────────────────┐
                │ READY_FOR_APPROVAL │
                └──────┬─────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
 ┌──────────┐ ┌─────────────────┐ ┌──────────┐
 │ APPROVED │ │CHANGES_REQUESTED│ │ REJECTED │
 └──────────┘ └────────┬────────┘ └──────────┘
                       │
                       ▼ (Creator modifies & resubmits)
               [ Return to PENDING ]
```

- **Separation of Duties (RBAC):** Content Creators (`Creator` role) are prohibited from approving their own drafts. Approval requires a user with the `Reviewer` or `Brand Manager` role.
- **Illegal Transition Defense:** Any attempt to approve an unanalyzed draft or jump states illegally throws an explicit `409 IllegalStateTransitionError`.

### E. One-Click Interactive Correction Diff Engine
For each `contradicted` or `needs_verification` finding, BrandOS AI generates a context-aware, legally compliant suggested replacement:
- **Exact Offset Tracking:** Highlights the precise `startIndex` and `endIndex` of the violative phrase in the active text.
- **One-Click Patching:** The frontend allows creators to preview side-by-side diffs and apply replacements with a single click.
- **Audit Synchronization:** Applying a suggestion automatically logs a `suggestion_applied` or `draft_edited` event in the audit trail.

### F. Tamper-Evident Immutable Audit Ledger
The audit subsystem in `server/services/governance/auditLedger.ts` guarantees complete accountability:
- Records every draft creation, AI review run, suggestion application, manual edit, and human decision.
- Captures `actorId`, `actorName`, `actorRole`, `actionType`, `previousStatus`, `newStatus`, `details`, and timestamp.
- Backed by an append-only PostgreSQL table (`audit_events`) protected by strict Row Level Security (read-only for non-service operations).

### G. Multi-Tenant Row Level Security (RLS)
Enterprise data isolation is enforced at the database kernel level via PostgreSQL RLS policies in `server/db/migrations/002_rls_policies.sql`:
- Helper functions `auth_workspace_id()` and `auth_user_role()` resolve the calling user's tenant context.
- Guarantees that users in Workspace A can never view, query, or modify brand guidelines, review drafts, or audit records belonging to Workspace B.

---

## 5. Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19.3, Vite 8.3, TypeScript 5 | Ultra-responsive single-page application with modern hooks |
| **Styling & Icons** | Tailwind CSS 3.4, Lucide React | Curated enterprise design system with accessible contrast |
| **Data Visualization** | Recharts 3.10 | Interactive governance analytics, trends, and category charts |
| **Forms & Validation** | React Hook Form 7.9, Zod 4.6 | Type-safe form inputs and payload validation |
| **Backend API** | Node.js (v20+), Express 5.3, TSX | High-performance RESTful API microservice |
| **AI Inference** | Google Gemini 3.8 Flash (`@google/genai`) | Low-latency structured JSON compliance evaluations |
| **Vector Embeddings** | Google `gemini-embedding-001` | 3072-dimensional semantic passage search |
| **Database & Auth** | Supabase Cloud (PostgreSQL 15+) | Relational persistence, Row Level Security, JSONB fields |
| **File Storage** | Supabase Storage / Local Multer | PDF document storage and binary streaming |
| **Testing Framework** | Vitest 5.0, Supertest 7.3 | Parallelized unit, integration, and live AI test runner |
| **Static Analysis** | Oxlint 1.88 | High-speed static analysis and linting |
| **Containerization** | Docker (Alpine multi-stage) | Production-ready, minimal-footprint container deployment |

---

## 6. Feature Capability Matrix (Dev vs. Production)

BrandOS AI features an **Isomorphic Fallback Engine**: it can run completely offline for development and testing, or connect to cloud infrastructure for production scale:

| Capability | Local Development (`ALLOW_DEV_FALLBACK=true`) | Production Cloud (`ALLOW_DEV_FALLBACK=false`) |
| :--- | :--- | :--- |
| **PDF Guideline Ingestion** | In-memory parsing, page-aware chunking | Local parsing + binary storage in Supabase Storage |
| **Passage Retrieval** | Lexical keyword frequency & token overlap | Hybrid dense vector embeddings (3072-dim) + keyword rank |
| **Claim Analysis** | Deterministic rule engine (FTC/FDA, ESG, tone) | Google Gemini 3.8 Flash with structured JSON output |
| **Evidence Verification** | Verbatim ground-truth verification | Verbatim ground-truth verification |
| **Review State Machine** | In-memory state machine with RBAC rules | In-memory validation + PostgreSQL persistence |
| **Approval Decisions** | Full approval/rejection lifecycle | Persisted in `approval_decisions` table with RLS |
| **Audit Trail** | In-memory FIFO audit log | Append-only immutable PostgreSQL `audit_events` |
| **Governance Analytics** | Computed live from active review memory | Aggregated across PostgreSQL database records |
| **Missing Credentials** | Clear UI notice, offline mode remains functional | Strict `503 ServiceNotConfiguredError` (no silent mocks) |

---

## 7. REST API Endpoints Specification

### System Diagnostics
- `GET /api/health` — System status, active execution mode, and external integration health.

### Brand Guidelines & Knowledge Base
- `GET /api/documents` — List brand guidelines with filters (`search`, `category`, `status`).
- `GET /api/documents/:id` — Retrieve a single document and all extracted sections.
- `POST /api/documents/upload` — Upload guideline PDF (`multipart/form-data`), extract text, chunk, and index.
- `PATCH /api/documents/:id/archive` — Toggle guideline active or archived state.
- `DELETE /api/documents/:id` — Remove guideline from active registry.

### Content Reviews & Decisions
- `GET /api/reviews` — List all content review drafts with status and content-type filters.
- `GET /api/reviews/:id` — Retrieve a specific draft, findings, evidence passages, and stats.
- `POST /api/reviews` — Submit copy for review, execute RAG pipeline, and generate evidence-backed findings.
- `PATCH /api/reviews/:id/draft` — Manually update review copy.
- `POST /api/reviews/:id/suggestions/:findingId/apply` — Apply suggested correction to active draft text.
- `POST /api/reviews/:id/suggestions/:findingId/reject` — Dismiss suggested correction.
- `POST /api/reviews/:id/decision` — Submit formal human decision (`approved`, `changes_requested`, `rejected`).

### Audit & Governance Analytics
- `GET /api/audit` — Retrieve immutable chronological audit history.
- `GET /api/analytics` — Quantitative governance metrics (compliance rate, severity breakdown, trends).

### Workspace & Persona Switcher
- `GET /api/auth/me` — Current user profile.
- `POST /api/auth/switch` — Switch active user persona (`Creator`, `Reviewer`, `Brand Manager`).
- `GET /api/users` — List workspace team members.
- `GET /api/workspaces` — List accessible workspaces.
- `GET /api/workspaces/current` — Current workspace details.
- `POST /api/workspaces/switch` — Switch active workspace context.

---

## 8. Relational Database Schema

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   workspaces    │◄──────┤    profiles     │       │ brand_documents │
│─────────────────│ 1   * │─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ name            │       │ workspace_id(FK)│       │ workspace_id(FK)│
│ slug            │       │ full_name       │       │ name            │
│ created_at      │       │ role (ENUM)     │       │ category (ENUM) │
└────────┬────────┘       └────────┬────────┘       │ version         │
         │                         │                │ storage_path    │
         │ 1                       │ 1              └────────┬────────┘
         │                         │                         │ 1
         │ *                       │ *                       │ *
┌────────▼────────┐       ┌────────▼────────┐       ┌────────▼────────┐
│  review_drafts  │◄──────┤approval_decision│       │document_sections│
│─────────────────│       │─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ workspace_id(FK)│       │ review_id (FK)  │       │ document_id (FK)│
│ author_id (FK)  │       │ reviewer_id (FK)│       │ heading         │
│ title           │       │ decision (ENUM) │       │ page_number     │
│ content         │       │ comments        │       │ extracted_text  │
│ status (ENUM)   │       └─────────────────┘       │ embedding (VEC) │
└────────┬────────┘                                 └─────────────────┘
         │ 1
         │ *
┌────────▼────────┐       ┌─────────────────┐
│    findings     │       │  audit_events   │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ review_id (FK)  │       │ workspace_id(FK)│
│ claim_text      │       │ actor_id (FK)   │
│ status (ENUM)   │       │ action_type     │
│ severity (ENUM) │       │ previous_status │
│ explanation     │       │ new_status      │
│ suggested_fix   │       │ details (JSONB) │
│ cited_passage   │       │ created_at      │
└─────────────────┘       └─────────────────┘
```

---

## 9. Quick Start Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** npm (v9+) or pnpm / yarn

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/your-org/brandos-ai.git
cd brandos-ai
npm install --legacy-peer-deps
```

### Step 2: Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
*(The platform runs out-of-the-box in development mode without external API keys).*

### Step 3: Run the Test Suite
Ensure all 51 tests pass:
```bash
npm test
```

### Step 4: Launch the Local Servers
In terminal 1 (Express API Backend):
```bash
npm run server
```
In terminal 2 (Vite Frontend):
```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 10. Production Deployment Guide

### Option A: Unified Container (Docker / Cloud Run / Render)
BrandOS AI includes an optimized multi-stage `Dockerfile`. In production, Express automatically serves both the `/api/*` endpoints and the compiled React frontend `dist/` bundle with client-side SPA routing fallback.

1. **Build and Test the Docker Image Locally:**
   ```bash
   docker build -t brandos-ai:latest .
   docker run -p 5000:5000 --env-file .env brandos-ai:latest
   ```

2. **Deploy to Render (Web Service):**
   - Connect your GitHub repository.
   - Environment: `Node` (or `Docker`).
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Add your environment variables in the Render dashboard.

3. **Deploy to Google Cloud Run:**
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/brandos-ai
   gcloud run deploy brandos-ai \
     --image gcr.io/YOUR_PROJECT_ID/brandos-ai \
     --platform managed \
     --port 5000 \
     --allow-unauthenticated
   ```

### Option B: Decoupled (Vercel Frontend + Render Backend)
- **Frontend (Vercel / Netlify / Cloudflare Pages):**
  - Root directory: `./`
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Environment Variable: `VITE_API_BASE_URL=https://your-backend-api.onrender.com`
- **Backend (Render / Railway / Fly.io):**
  - Build Command: `npm install --legacy-peer-deps`
  - Start Command: `npm start`
  - Ensure CORS origin allows your frontend domain (configured by default).

### Supabase Cloud Database Provisioning
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your Supabase dashboard.
3. Execute `server/db/migrations/001_initial_schema.sql`.
4. Execute `server/db/migrations/002_rls_policies.sql`.
5. Open **Storage**, create a new bucket named `brand-guidelines`.

---

## 11. Environment Configuration Dictionary

| Variable | Required in Prod | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `5000` | Port for the Express HTTP server |
| `NODE_ENV` | Yes | `development` | Runtime environment (`development`, `production`, `test`) |
| `ALLOW_DEV_FALLBACK` | Yes | `true` | When `false`, strictly enforces external Gemini & Supabase connectivity |
| `GEMINI_API_KEY` | Yes (in Cloud) | *None* | Google Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | Optional | `gemini-3.8-flash` | Gemini model name for analysis |
| `GEMINI_TIMEOUT_MS` | Optional | `30000` | Milliseconds before AI inference times out |
| `SUPABASE_URL` | Yes (in Cloud) | *None* | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Yes (in Cloud) | *None* | Public anon key for client-side queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (in Cloud) | *None* | Secret key bypassing RLS for administrative operations |
| `SUPABASE_STORAGE_BUCKET` | Optional | `brand-guidelines` | Storage bucket for uploaded guideline PDFs |
| `VITE_API_BASE_URL` | Decoupled only | `""` | Backend URL for standalone Vite frontend builds |
| `VITE_USE_MOCK` | Optional | `false` | Forces the frontend to use local client-side mock storage |

---

## 12. Testing & Quality Assurance

BrandOS AI enforces rigorous verification across all architectural layers.

```bash
# Run the complete test suite
npm test

# Run tests in watch mode
npm run test:watch

# Execute live Gemini AI diagnostics
npm run check:ai

# Execute high-speed code linter
npm run lint

# Validate TypeScript type compilation and bundle output
npm run build
```

### Automated Test Coverage (51 Tests across 12 Suites)
- **`chunker.test.ts`**: PDF text deconstruction, heading hierarchy detection, rule density calculation.
- **`retriever.test.ts`**: Token ranking, keyword overlap, and section scoring.
- **`embeddings.test.ts`**: Vector generation, 3072-dimension cosine similarity, and safe error handling.
- **`evidenceValidator.test.ts`**: Verbatim citation matching, anti-hallucination guardrail, and automatic status downgrades.
- **`stateMachine.test.ts`**: Review lifecycle transitions, role restrictions, and illegal transition defense.
- **`approvalEnforcement.test.ts`**: Verifies Creators cannot self-approve; confirms Reviewer and Manager permissions.
- **`tenantIsolation.test.ts`**: Validates strict multi-tenant workspace separation.
- **`auditEmission.test.ts`**: Confirms event emissions on draft changes, suggestions, and decisions.
- **`metricsReconciliation.test.ts`**: Mathematical verification of compliance rates and violation distributions.
- **`ragAudit.test.ts`**: Robustness against malformed PDFs, scanned documents, and edge-case inputs.
- **`envValidation.test.ts`**: Confirms missing variables are identified without leaking secret keys in logs.
- **`apiIntegration.test.ts`**: End-to-end Supertest execution of all Express routes, decision submissions, and live Gemini AI integration.

---

<p align="center">
  <sub>BrandOS AI Enterprise Platform • Built with precision for brand safety, compliance assurance, and responsible enterprise AI.</sub>
</p>
