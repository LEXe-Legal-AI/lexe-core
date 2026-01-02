# LEO Webchat - Claude Instructions

> Premium Webchat con Streaming Typewriter e Architettura Modulare

---

## Design Philosophy (MANDATORY)

### EVITARE (Anti-AI-Slop):
- NO layout centrati eccessivi
- NO gradienti viola predittivi
- NO angoli arrotondati uniformi (border-radius: 8px ovunque)
- NO font Inter/Arial generici
- NO estetica "cookie-cutter" da template
- NO ombre uniformi ovunque

### APPLICARE:
- **Estetica**: Luxury/Refined + Tech Innovation
- **Font**: Poppins (headings) + Lora (body) + JetBrains Mono (code)
- **Animazioni**: Framer Motion, page-load reveals coordinati
- **Composizione**: Asimmetria, overlap, elementi grid-breaking
- **Effetti**: Glassmorphism, texture, gradienti stratificati
- **Dettagli**: Micro-interazioni, hover states elaborati

---

## Brand Colors

```css
:root {
  /* Brand Core */
  --leo-primary: #1E3A5F;      /* Deep Navy */
  --leo-secondary: #F7931E;    /* Vibrant Orange */
  --leo-accent: #00A896;       /* Teal Green */
  --leo-dark: #0D1B2A;         /* Almost Black */
  --leo-light: #F8F9FA;        /* Off White */
  --leo-gray: #6C757D;         /* Neutral Gray */

  /* Glassmorphism */
  --glass-bg: rgba(30, 58, 95, 0.6);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 12px;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #1E3A5F 0%, #2a4a6f 100%);
  --gradient-accent: linear-gradient(135deg, #F7931E 0%, #ff9f43 100%);
  --gradient-glow: linear-gradient(135deg, #00A896 0%, #00d9b5 100%);
}
```

---

## Component Patterns

### Message Bubble (Streaming)

```tsx
// Usa TypewriterMessage per risposte AI
<TypewriterMessage
  tokens={streamingTokens}
  isStreaming={isStreaming}
  onSkip={handleSkip}
/>
```

- Effetto cursore lampeggiante durante streaming
- Skip button per saltare animazione
- Syntax highlighting per code blocks (Shiki)
- Copy button su hover per code

### Glassmorphism Card

```tsx
<GlassCard glow hover>
  <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl p-6">
    {children}
  </div>
</GlassCard>
```

### Animazioni Entry

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
```

---

## Streaming Pattern

```typescript
// SSE endpoint: POST /api/v1/chat/stream
// Events: phase_start, token, tool_call, tool_result, done, error

const eventSource = new EventSource('/api/v1/chat/stream?...');

eventSource.onmessage = (e) => {
  const { event, data } = JSON.parse(e.data);

  switch (event) {
    case 'token':
      addTokens(data.content);
      break;
    case 'tool_call':
      showToolExecution(data);
      break;
    case 'done':
      finishStreaming();
      break;
  }
};
```

---

## Plugin Interface

```typescript
interface Plugin {
  id: string;
  type: 'tool' | 'channel' | 'memory';
  name: string;
  icon: string;

  // Rendering
  renderIcon: () => ReactNode;
  renderPanel: (props: PanelProps) => ReactNode;
  renderInMessage?: (props: MessageProps) => ReactNode;

  // Lifecycle
  onActivate?: () => void;
  onDeactivate?: () => void;
}
```

---

## i18n (6 Lingue)

| Lingua | Codice | Priorità |
|--------|--------|----------|
| Italiano | it | P0 |
| English | en | P0 |
| Français | fr | P1 |
| Español | es | P1 |
| Deutsch | de | P1 |
| Português (BR) | pt-BR | P1 |

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
t('chat.send'); // "Invia" / "Send" / "Envoyer" ...
```

---

## Response Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Max message length | 32,000 chars | Webchat generous limit |
| Max LLM tokens | 4,096 | ~3,000 words IT |
| Input message | 10,000 chars | User input limit |

---

## File Organization

```
src/
├── components/
│   ├── chat/          # Chat UI components
│   ├── preview/       # Preview panel, memory viewer
│   ├── layout/        # Header, sidebar, resizable
│   ├── widget/        # Embeddable widget
│   ├── ui/            # shadcn/ui components
│   └── effects/       # GlassCard, animations
├── hooks/             # useTypewriter, useStreaming, etc.
├── stores/            # Zustand stores
├── plugins/           # Modular plugin system
├── services/          # API, SSE, WebSocket clients
├── styles/            # CSS variables, themes
├── i18n/              # Localization files
└── types/             # TypeScript definitions
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Widget bundle | < 50KB gzipped |
| First paint | < 1s |
| Streaming latency | < 100ms |
| Memory usage | < 50MB |

---

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite 5
- **Styling**: Tailwind CSS 3.4 + CSS Variables
- **Animation**: Framer Motion
- **State**: Zustand
- **UI**: shadcn/ui (40+ components)
- **i18n**: i18next + react-i18next
- **Virtualization**: react-window (message list)
- **Graph**: React Flow (memory L4)

---

## Slogan

> "Dal caos ai risultati" / "From chaos to results"

---

## Current Focus
**Sprint: Webchat Integration (Jan 2026)**

### Completed (Jan 2, 2026)
- [x] API client with auth token management
- [x] Conversation API service
- [x] useStreaming hook with real backend
- [x] File upload handling with drag-and-drop
- [x] **Magic Link Authentication**: Email-based passwordless login
- [x] **Guest Auth Removed**: Replaced with magic link
- [x] **Tools Panel Fix**: SSE events now propagate to streamStore
- [x] **Language Selector Polish**: Keyboard navigation and ARIA accessibility
- [x] **UserMenu**: Dropdown with avatar, user info, logout
- [x] **Dark/Light mode**: Synchronous theme initialization

### Authentication Flow
```typescript
// Magic link authentication
// 1. User enters email on login page
// 2. Backend sends magic link (logged to console in dev)
// 3. User clicks link: /auth/verify?token=xxx
// 4. CallbackPage verifies token and stores JWT
// 5. User is authenticated and redirected to chat

// Routes
/login         - Email form + OAuth button
/auth/verify   - Magic link verification
/callback      - OAuth callback
```

### File Upload
```typescript
// Drag-and-drop or click to attach
import { FileUploadTrigger, useFileDrop } from '@/components/chat/FileUpload';
import { useAttachmentStore } from '@/stores';

// Supported: images, documents, code files
// Max size: 10MB images, 20MB documents, 1MB code
```

### API Services
```
src/services/api/
├── client.ts        # ApiClient with auth
├── conversations.ts # Conversation CRUD
├── upload.ts        # File upload service
└── index.ts         # Exports
```

### Auth Components
```
src/components/auth/
├── LoginPage.tsx    # Email magic link + OAuth
└── CallbackPage.tsx # Magic link + OAuth verification
```

### Remaining Gaps

#### Backend Integration
- [ ] Memory viewer API integration
- [ ] WebSocket for real-time updates
- [ ] Offline support

#### Code Quality
- [x] forwardRef warnings fixed
- [x] Timestamp parsing fixed
- [x] Unused variable warnings cleaned up

---

*Ultimo aggiornamento: 2026-01-02*
