# LEO Webchat

> Premium Webchat con Streaming Typewriter e Architettura Modulare

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)

---

## Features

- **Streaming Typewriter** - Token-by-token SSE con effetto typing realistico
- **Glassmorphism UI** - Design premium anti-AI-slop con backdrop-blur
- **Zustand Store** - State management con persistenza localStorage
- **i18n** - 6 lingue (IT, EN, FR, ES, DE, PT-BR)
- **Markdown Rendering** - Bold, italic, code blocks, liste, headers
- **Conversation History** - Sidebar con CRUD conversazioni
- **Responsive** - Mobile-first design

## Quick Start

```bash
# Clone
git clone https://github.com/LEO-ITC/leo-webchat.git
cd leo-webchat

# Install
npm install

# Dev server (porta 3001)
npm run dev

# Build
npm run build
```

## Backend Integration

LEO Webchat connects to the LEO Gateway for real-time streaming:

- **Guest Auth**: Automatic guest session creation on first visit
- **SSE Streaming**: Real-time token-by-token responses
- **Conversation API**: Full CRUD for chat history
- **File Upload**: Drag-and-drop attachments support

## Tech Stack

| Tecnologia | Versione | Uso |
|------------|----------|-----|
| React | 18.3 | UI Framework |
| TypeScript | 5.6 | Type Safety |
| Vite | 6.x | Build Tool |
| Tailwind CSS | 3.4 | Styling |
| Framer Motion | 11.x | Animations |
| Zustand | 5.x | State Management |
| i18next | 24.x | Internationalization |
| Lucide React | latest | Icons |

## Project Structure

```
src/
├── components/
│   ├── chat/           # ChatMessage, MarkdownRenderer, TypewriterMessage
│   ├── effects/        # GlassCard, AnimatedBorder, PulseRing
│   └── layout/         # ChatSidebar
├── hooks/              # useTypewriter, useStreaming
├── stores/             # Zustand chatStore (persistent)
├── services/           # SSEClient, StreamParser
├── styles/             # CSS variables, glassmorphism
├── i18n/               # Localization (6 languages)
└── types/              # TypeScript definitions
```

## Components

### ChatMessage
- Avatar differenziato (user/assistant)
- Glassmorphism background
- Copy button on hover
- Timestamp
- Markdown rendering

### MarkdownRenderer
- **Bold** e *italic*
- `inline code`
- Code blocks con language tag
- Headers (##, ###)
- Liste ordinate/non ordinate
- Links

### ChatSidebar
- Lista conversazioni
- Create/delete/rename
- Persistenza localStorage

## SSE Integration

```typescript
// SSE Event Types
enum SSEEventType {
  PHASE_START = 'phase_start',
  TOKEN = 'token',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  DONE = 'done',
  ERROR = 'error',
}

// Usage
const client = new SSEClient('/api/v1/chat/stream', {
  method: 'POST',
  body: JSON.stringify({ message }),
  onEvent: (event) => {
    if (event.type === SSEEventType.TOKEN) {
      appendToken(event.data.content);
    }
  },
});
```

## Environment Variables

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## Brand Colors

```css
--leo-primary: #1E3A5F;    /* Deep Navy */
--leo-secondary: #F7931E;  /* Vibrant Orange */
--leo-accent: #00A896;     /* Teal Green */
--leo-dark: #0D1B2A;       /* Almost Black */
```

## Ports

| Service | Port |
|---------|------|
| Dev server | 3001 |
| Widget static | 8020 |
| BFF API | 8021 |

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint check
npm run typecheck  # TypeScript check
```

## Roadmap

- [ ] Backend BFF per SSE reale
- [ ] Attachment handling (PDF, DOCX, audio)
- [ ] Widget embeddable (<50KB)
- [ ] Speech-to-text (Groq Whisper)
- [ ] Tool call visualization
- [ ] Memory L4 graph (React Flow)

## Related Repositories

| Repository | Description |
|------------|-------------|
| [leo-core](https://github.com/LEO-ITC/leo-core) | Identity, Gateway APIs |
| [leo-orchestrator](https://github.com/LEO-ITC/leo-orchestrator) | ORCHIDEA Pipeline |
| [leo-frontend](https://github.com/LEO-ITC/leo-frontend) | Admin Panel |
| [leo-docs](https://github.com/LEO-ITC/leo-docs) | Documentation |

## License

Proprietary - LEO-ITC

---

**LEO** - *Dal caos ai risultati*
