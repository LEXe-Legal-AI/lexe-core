# leo-frontend - Claude Context

## Overview

LEO Admin Panel - React 18 + TypeScript frontend for the LEO Platform.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18.3 |
| Language | TypeScript 5.7 |
| Build | Vite 6.0 |
| Styling | Tailwind CSS 3.4 |
| UI Components | Radix UI + shadcn/ui |
| State | Zustand 5 (client) + TanStack Query 5 (server) |
| Routing | React Router 7.1 |
| Real-time | WebSocket with auto-reconnect |
| HTTP Client | Axios with JWT |

## Pages (11 Implemented)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Metrics, status, real-time updates |
| `/agents` | Agents | Agent management, task tracking |
| `/pipeline` | Pipeline | ORCHIDEA 7-phase visualization |
| `/memory` | Memory | L0-L4 hierarchy, knowledge graph |
| `/users` | Users | User CRUD, sessions, activity |
| `/conversations` | Conversations | 3-panel messaging |
| `/contacts` | Contacts | Contact management |
| `/tenants` | Tenants | Multi-tenant CRUD, plans, features |
| `/channels` | Channels | WhatsApp/Email/SMS/Web config |
| `/review` | Coda Revisione | HAS review queue |
| `/settings` | Settings | Configuration |

## Key Files

```
src/
├── api/           # API layer (client.ts, websocket.ts, review.ts, etc.)
├── components/    # UI components (ui/, layout/, dashboard/)
├── pages/         # Page components
├── stores/        # Zustand stores (authStore, reviewStore, etc.)
├── hooks/         # Custom hooks (useWebSocket, queries/)
└── App.tsx        # Main routing
```

## Commands

```bash
# Development
npm run dev          # Start dev server (port 3000)

# Build
npm run build        # Production build
npm run preview      # Preview production

# Testing
npm run test         # Run Vitest
npm run test:coverage

# Lint
npm run lint
npm run typecheck
```

## API Proxy

Dev server proxies `/api` to `http://localhost:8000` (leo-core Gateway).

## Current Focus

- Review Queue (HAS) implementation complete
- All 9 admin pages implemented
- WebSocket real-time updates active
- Italian localization

## Recent Changes (2025-12-29)

- Added Review Queue page (`/review`)
- Added `reviewStore.ts` Zustand store
- Added `review.ts` API module
- Updated Sidebar navigation
- Updated README documentation
