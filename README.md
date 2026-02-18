# Language Learning Platform

An interactive language learning platform inspired by Rosetta Stone, combining images, text, Text-to-Speech (TTS), and Speech-to-Text (STT) for an immersive learning experience.

## Project Structure

This is a monorepo containing both frontend and backend applications:

```
language-learning-platform/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # TTS, STT, and API services
│   │   ├── utils/         # Utility functions
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript type definitions
│   │   └── test/          # Test utilities
│   └── package.json
├── backend/           # Node.js/Express backend
│   ├── src/
│   │   ├── services/      # Business logic services
│   │   ├── routes/        # API routes
│   │   ├── models/        # Data models
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utility functions
│   │   ├── types/         # TypeScript type definitions
│   │   └── test/          # Test utilities
│   └── package.json
└── package.json       # Root package.json for workspace management
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL 14+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

3. Start development servers:
```bash
npm run dev
```

This will start both frontend (http://localhost:5173) and backend (http://localhost:3000) servers.

## Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications
- `npm test` - Run tests in all workspaces
- `npm run lint` - Lint all workspaces
- `npm run format` - Format code with Prettier

### Frontend
- `npm run dev --workspace=frontend` - Start frontend dev server
- `npm run build --workspace=frontend` - Build frontend for production
- `npm test --workspace=frontend` - Run frontend tests

### Backend
- `npm run dev --workspace=backend` - Start backend dev server
- `npm run build --workspace=backend` - Build backend for production
- `npm test --workspace=backend` - Run backend tests

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Query for state management
- Web Speech API for TTS/STT
- Vitest + fast-check for testing

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL database
- JWT authentication
- Vitest + fast-check for testing

## Testing

The project uses:
- **Vitest** for unit testing
- **fast-check** for property-based testing
- **React Testing Library** for component testing
- **Playwright** for E2E testing (to be added)

Run tests:
```bash
npm test
```

## License

MIT
