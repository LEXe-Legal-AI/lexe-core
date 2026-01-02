# LEXe Core

Monorepo for LEXe 2.0 - Legal AI Assistant Platform

## Structure

```
lexe-core/
├── packages/
│   ├── api/              # FastAPI Backend
│   ├── webchat/          # React Webchat Frontend
│   ├── admin-panel/      # React Admin Dashboard
│   └── shared/           # Shared TypeScript types
├── docker-compose.yml
├── Makefile
└── README.md
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI + SQLAlchemy 2 + Pydantic 2 |
| Frontend | React 18 + Vite + shadcn/ui + TailwindCSS |
| Database | PostgreSQL 17 + pgvector + Apache AGE |
| Cache | Valkey 8 |
| LLM | LiteLLM (multi-provider) |

## Quick Start

```bash
# Clone
git clone https://github.com/LEXe-Legal-AI/lexe-core.git
cd lexe-core

# Start services
docker-compose up -d

# API: http://localhost:8000
# Webchat: http://localhost:3000
# Admin: http://localhost:3001
```

## Related Repositories

- [lexe-docs](https://github.com/LEXe-Legal-AI/lexe-docs) - Documentation
- [lexe-memory](https://github.com/LEXe-Legal-AI/lexe-memory) - Memory Service
- [lexe-orchestrator](https://github.com/LEXe-Legal-AI/lexe-orchestrator) - LLM Orchestration
- [lexe-tools-it](https://github.com/LEXe-Legal-AI/lexe-tools-it) - Legal Tools Italia
- [lexe-tools-br](https://github.com/LEXe-Legal-AI/lexe-tools-br) - Legal Tools Brasil
- [lexe-infra](https://github.com/LEXe-Legal-AI/lexe-infra) - Infrastructure

## Documentation

See [lexe-docs](https://github.com/LEXe-Legal-AI/lexe-docs) for complete documentation.
