<div align="center">

# 🛡️ Chakravyuh

### AI-Powered Banking Fraud Intelligence Platform

*Multi-layered AML/CFT detection, investigation, and regulatory reporting for Indian scheduled banks*

[![CI](https://github.com/Suyashh-s/Chakravyuh/actions/workflows/ci.yml/badge.svg)](https://github.com/Suyashh-s/Chakravyuh/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Overview

**Chakravyuh** (चक्रव्यूह — "the inescapable formation") is a production-grade, full-stack AI fraud intelligence platform built for Indian scheduled banks. It combines real-time ML risk scoring, AML graph analysis, LLM-powered case investigation via RAG (gpt-4o-mini), and FIU-IND-compliant regulatory reporting into a unified console for fraud analysts and senior executives. All amounts are in INR; regulatory references align to PMLA 2002, RBI Master Directions, and FIU-IND guidelines.

### Key Capabilities

| Layer | Capability | Technology |
|-------|-----------|------------|
| **Pre-Transaction** | Real-time risk scoring with behavioral, device, and graph signals | Deterministic scoring engine |
| **Post-Transaction** | Case investigation with AI-generated explanations | OpenAI gpt-4o-mini + RAG |
| **Graph Intelligence** | Circular transfer detection, money laundering ring identification | NetworkX |
| **Knowledge Retrieval** | Policy lookup, case memory, fraud knowledge base search | ChromaDB |
| **Reporting** | Automated FIU reports with chain-of-custody hashing | ReportLab |
| **Executive Analytics** | KPIs, model health, compliance tracking, trend analysis | Recharts |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Analyst     │  │  Executive   │  │   Shared Components    │ │
│  │  Dashboard    │  │  Dashboard   │  │  Graph · Charts · UI   │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬───────────┘ │
│         └─────────────────┼───────────────────────┘             │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API
┌─────────────────────────────┴───────────────────────────────────┐
│                       BACKEND (FastAPI)                          │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │  Risk    │  │  Alert   │  │  Case   │  │    Dashboard     │  │
│  │ Scoring  │  │ Service  │  │ Service │  │    Service       │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────────────────┘  │
│       │             │             │                              │
│  ┌────┴─────────────┴─────────────┴────┐                        │
│  │          INTELLIGENCE LAYER          │                        │
│  │  ┌─────────┐ ┌────────┐ ┌────────┐  │                        │
│  │  │ OpenAI  │ │ Graph  │ │ChromaDB│  │                        │
│  │  │ LLM     │ │Analysis│ │Vectors │  │                        │
│  │  └─────────┘ └────────┘ └────────┘  │                        │
│  └─────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
chakravyuh/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/routes/     # REST endpoints
│   │   │   ├── core/           # Risk scoring engine
│   │   │   ├── graph/          # NetworkX graph analysis
│   │   │   ├── llm/            # OpenAI integration
│   │   │   ├── models/         # Data models
│   │   │   ├── retrieval/      # ChromaDB vector store
│   │   │   ├── schemas/        # Pydantic request/response schemas
│   │   │   ├── services/       # Business logic
│   │   │   ├── utils/          # PDF generation, hashing
│   │   │   ├── config.py       # Environment configuration
│   │   │   └── main.py         # Application entrypoint
│   │   ├── tests/              # pytest test suite
│   │   └── requirements.txt
│   │
│   └── web/                    # Next.js 14 frontend
│       ├── app/                # App Router pages
│       │   ├── analyst/        # Analyst dashboard, alerts, cases
│       │   └── executive/      # Executive dashboard
│       ├── components/
│       │   ├── dashboard/      # KPI charts, alert inbox, case table
│       │   ├── graph/          # React Flow fraud network
│       │   ├── layout/         # Sidebar, header, theme
│       │   ├── shared/         # Loading skeletons, empty states
│       │   └── ui/             # shadcn/ui base components
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # API client, utilities
│       └── types/              # TypeScript type definitions
│
├── data/
│   ├── sample/                 # Realistic sample datasets
│   └── docs/                   # Fraud knowledge base, policies
│
├── docker/                     # Dockerfiles
├── packages/shared/            # Shared constants & types
├── scripts/                    # Utility scripts
└── .github/workflows/          # CI pipeline
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- OpenAI API key (optional — system works with template fallbacks)

### 1. Clone & Configure

```bash
git clone https://github.com/Suyashh-s/Chakravyuh.git
cd chakravyuh
cp .env.example .env
# Edit .env to add your OPENAI_API_KEY (optional)
```

### 2. Backend

```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `/docs`.

### 3. Frontend

```bash
cd apps/web
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Docker (Alternative)

```bash
docker compose up --build
```

This starts both the API (port 8000) and web frontend (port 3000).

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/risk/score` | Real-time transaction risk scoring |
| `GET` | `/api/alerts` | List alerts with filtering & pagination |
| `GET` | `/api/alerts/{id}` | Get alert details |
| `POST` | `/api/alerts/{id}/explain` | AI-generated alert explanation |
| `GET` | `/api/cases` | List investigation cases |
| `GET` | `/api/cases/{id}` | Full case detail with evidence |
| `GET` | `/api/graph/{case_id}` | Transaction network graph data |
| `GET` | `/api/reports/{case_id}/pdf` | Download FIU report PDF |
| `GET` | `/api/dashboard/analyst` | Analyst dashboard metrics |
| `GET` | `/api/dashboard/executive` | Executive dashboard metrics |
| `POST` | `/api/feedback` | Submit analyst feedback |
| `POST` | `/api/knowledge/search` | Search fraud knowledge base |

---

## Risk Scoring Engine

The deterministic scoring engine evaluates transactions across 5 signal dimensions:

```
Risk Score = Σ(weighted component scores)

Components:
├── Amount Anomaly     (0-100) × 0.25  — Deviation from behavioral baseline
├── Time Anomaly       (0-100) × 0.15  — Off-hours / unusual timing
├── Device Risk        (0-100) × 0.20  — Device trust score inversion
├── Beneficiary Risk   (0-100) × 0.20  — Receiver risk assessment
└── Graph Risk         (0-100) × 0.20  — Network topology signals
```

**Decision Matrix:**

| Score | Decision | Action |
|-------|----------|--------|
| < 30 | `approve` | Auto-approve |
| 30-60 | `mfa` | Step-up authentication |
| 60-80 | `manual_review` | Queue for analyst |
| ≥ 80 | `block` | Block & alert |

---

## Graph Analysis

NetworkX-powered analysis detects:

- **Circular Transfers** — Money flowing in cycles (A → B → C → A)
- **Rapid Chain Transfers** — Funds moving through 3+ accounts within 24 hours
- **Suspicious Clusters** — Densely connected account groups
- **High-Risk Paths** — Transaction chains involving flagged entities

---

## LLM Integration

When an OpenAI API key is configured, the system provides:

- **Alert Explanations** — Natural language analysis of why an alert was triggered
- **Case Summaries** — Comprehensive investigation summaries for analysts
- **Executive Summaries** — High-level briefings for leadership
- **Report Narratives** — SAR-quality narratives for FIU reports
- **Knowledge Q&A** — RAG-powered answers from the fraud knowledge base

Without an API key, the system falls back to template-based explanations.

---

## Frontend Features

### Analyst Console
- Real-time alert inbox with severity/status filtering
- Interactive case investigation with tabbed interface (Overview, Graph, Timeline, Evidence)
- React Flow-powered fraud network visualization
- AI explanation generation per alert
- FIU report PDF download

### Executive Dashboard
- Fraud detection KPIs (total detected, false positive rate, detection rate)
- Trend analysis charts (monthly fraud detected vs prevented)
- Model health monitoring (accuracy, precision, recall, F1)
- Compliance tracking (SAR/CTR filed, compliance score, audit dates)
- Risk category breakdown

### Design System
- Premium light banking theme (navy primary, white cards) with CSS custom properties
- shadcn/ui component library (Radix UI primitives + Tailwind CSS)
- Framer Motion animations
- Recharts data visualization
- React Flow graph rendering
- Responsive layout with sidebar navigation

---

## Testing

### Backend
```bash
cd apps/api
pytest tests/ -v
```

Tests cover:
- Risk scoring engine (component scores, integration)
- Graph analysis (cycle detection, clusters)
- API endpoints (all routes)

### Frontend
```bash
cd apps/web
npm run lint
npm run build
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | — | OpenAI API key for LLM features |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use for completions |
| `API_HOST` | No | `0.0.0.0` | Backend host |
| `API_PORT` | No | `8000` | Backend port |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL for CORS |
| `MONGODB_URI` | No | — | MongoDB connection string. Falls back to JSON sample files if unset |
| `MONGODB_DB_NAME` | No | `chakravyuh` | MongoDB database name |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript 5, Tailwind CSS 3 |
| UI Components | shadcn/ui, Radix UI, Framer Motion, Lucide React |
| Charts | Recharts |
| Graph Viz | React Flow |
| Backend | FastAPI, Python 3.11+, Pydantic v2 |
| AI/LLM | OpenAI gpt-4o-mini (RAG via FAISS) |
| Graph Analysis | NetworkX |
| Vector Store | ChromaDB |
| PDF Reports | ReportLab |
| Infrastructure | Docker, GitHub Actions CI |

---

## License

MIT

---

<div align="center">
<sub>Built by Suyash Sawant · v1.2.0 · Indian Banking Fraud Intelligence</sub>
</div>


# Terminal 1 — backend
cd apps/api
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

# Terminal 2 — frontend
cd apps/web
npm run dev     npm run dev:network
time he's ever sent moneyRajesh's father collapses at home in Pune at 2:30 AM. He rushes to Ruby Hall Clinic. The billing desk asks for ₹11,00,000 upfront for the ICU + surgery. Rajesh opens his ICICI app and does an IMPS transfer from his phone — a device he's used before — to the hospital's HDFC collection account (first  there).