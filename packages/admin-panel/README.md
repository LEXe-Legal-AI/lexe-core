# LEO Frontend

> Admin Panel & Agent Dashboard

[![React](https://img.shields.io/badge/React-18-61DAFB)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)]()
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)]()
[![Status](https://img.shields.io/badge/Status-80%25%20Complete-yellow)]()

## Overview

LEO Frontend provides two main interfaces:

- **Admin Panel**: System configuration, user management, analytics
- **Agent Dashboard**: Real-time message queue, human review interface, conversation view

Built with React 18 and TypeScript, using Tailwind CSS and shadcn/ui for styling.

## Current Status

| Category | Status |
|----------|--------|
| **Completion** | 80% |
| **Pages** | 11/11 implemented |
| **Components** | 20+ shadcn/ui components |
| **Localization** | Italian |
| **Real-time** | WebSocket active |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Language | TypeScript 5.7 |
| Build Tool | Vite 6.0 |
| Styling | Tailwind CSS 3.4 |
| UI Components | Radix UI + shadcn/ui (20+ components) |
| Client State | Zustand 5 |
| Server State | TanStack Query 5 |
| Routing | React Router 7.1 |
| Real-time | WebSocket with auto-reconnect |
| HTTP Client | Axios with JWT |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build
```

### Development Login

| Email | Password |
|-------|----------|
| `admin@leo.local` | `admin` |

## Project Structure

```
leo-frontend/
├── src/
│   ├── api/                    # API integration layer
│   │   ├── client.ts           # Axios HTTP client with JWT
│   │   ├── websocket.ts        # WebSocket client with auto-reconnect
│   │   ├── auth.ts             # Authentication API
│   │   ├── agents.ts           # Agent management API
│   │   ├── pipeline.ts         # ORCHIDEA pipeline API
│   │   ├── memory.ts           # Memory system (L0-L4) API
│   │   ├── users.ts            # User management API
│   │   ├── review.ts           # Review queue API (HAS)
│   │   └── types.ts            # TypeScript interfaces
│   ├── components/
│   │   ├── ui/                 # Base UI components (shadcn/ui)
│   │   ├── layout/             # MainLayout, Sidebar, Header
│   │   └── dashboard/          # Dashboard-specific components
│   ├── pages/                  # Page components (9 pages)
│   ├── hooks/                  # Custom React hooks
│   │   ├── useWebSocket.ts     # WebSocket connection
│   │   ├── useTheme.ts         # Theme switching
│   │   └── queries/            # TanStack Query hooks
│   ├── stores/                 # Zustand state stores
│   │   ├── authStore.ts        # Authentication state
│   │   ├── agentStore.ts       # Agent state
│   │   ├── realtimeStore.ts    # WebSocket state
│   │   ├── reviewStore.ts      # Review queue state
│   │   └── uiStore.ts          # UI state
│   ├── lib/                    # Utility functions
│   ├── App.tsx                 # Main app with routing
│   └── index.css               # Global styles
├── public/
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Implemented Pages (11/11)

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | System metrics, agent status, pipeline health, real-time updates |
| **Agents** | `/agents` | Agent management, task tracking, real-time status monitoring |
| **Pipeline** | `/pipeline` | ORCHIDEA 7-phase visualization, run metrics, phase configuration |
| **Memory** | `/memory` | L0-L4 memory hierarchy, knowledge graph, cache metrics |
| **Users** | `/users` | User CRUD, role assignment, session management, activity logs |
| **Conversations** | `/conversations` | 3-panel layout, messaging, channel support (WhatsApp, email, web, SMS) |
| **Contacts** | `/contacts` | Contact management, activity timeline, channel integration |
| **Tenants** | `/tenants` | Multi-tenant CRUD, plans, features management |
| **Channels** | `/channels` | WhatsApp/Email/SMS/Web channel configuration |
| **Coda Revisione** | `/review` | HAS-based review queue, approval/rejection workflow, confidence scores |
| **Settings** | `/settings` | General, notifications, integrations, security configuration |

## Zustand Stores

| Store | Purpose |
|-------|---------|
| `authStore` | Authentication state, JWT tokens, user session |
| `agentStore` | Agent list, status, task assignments |
| `reviewStore` | Review queue items, approval workflow |
| `realtimeStore` | WebSocket connection, real-time events |
| `uiStore` | Theme, sidebar state, notifications |

## Key Features

- **Real-time Updates**: WebSocket integration with auto-reconnect and heartbeat
- **Review Queue (HAS)**: AI response review with confidence scores, approval/rejection/escalation
- **Multi-Channel Support**: WhatsApp, Email, Web, SMS
- **Dark Mode**: Full theme support with system preference detection
- **Responsive Design**: Mobile-first Tailwind CSS
- **Italian Localization**: All UI labels in Italian

## Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Build
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # Run Vitest
npm run test:coverage    # Run with coverage

# Quality
npm run lint             # ESLint
npm run typecheck        # TypeScript check
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:8000/ws` |
| `VITE_AUTH_DOMAIN` | Auth domain (if using external) | - |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | - |

## Documentation

Full documentation available in [leo-docs](../leo-docs/):

- [Tech Stack](../leo-docs/docs/00-overview/TECH_STACK.md)
- [API Reference](../leo-docs/docs/08-api-reference/API_INDEX.md)
- [Governance & HAS](../leo-docs/docs/06-governance/GOVERNANCE_HAS.md)
- [Architecture Overview](../leo-docs/docs/01-architecture/ARCH_INDEX.md)

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Part of the [LEO Platform](https://github.com/LEO-ITC) - LLM Enhanced Orchestrator
