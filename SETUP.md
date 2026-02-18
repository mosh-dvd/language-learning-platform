# Project Setup Guide

This document provides detailed instructions for setting up the Language Learning Platform development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Redis** (v6 or higher) - [Download](https://redis.io/download/) (Optional but recommended for caching)
- **Git** - [Download](https://git-scm.com/)

## Initial Setup

### 1. Install Dependencies

From the root directory, install all dependencies for both frontend and backend:

```bash
npm install
```

This will install dependencies for the root workspace and both the frontend and backend workspaces.

### 2. Configure Backend Environment

1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=language_learning
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password

JWT_SECRET=your-secure-secret-key
JWT_EXPIRES_IN=7d

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

CORS_ORIGIN=http://localhost:5173

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Set Up Redis (Optional but Recommended)

Redis is used for caching to improve performance. While optional, it's highly recommended for production.

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

For more details on Redis setup and caching, see `backend/src/services/README_REDIS.md`.

### 4. Set Up Database

1. Create a PostgreSQL database:
```bash
createdb language_learning
```

Or using psql:
```sql
CREATE DATABASE language_learning;
```

2. Database migrations will be set up in a later task.

## Development

### Start Development Servers

From the root directory:

```bash
npm run dev
```

This starts both servers concurrently:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Start Individual Servers

Frontend only:
```bash
npm run dev:frontend
```

Backend only:
```bash
npm run dev:backend
```

## Testing

### Run All Tests

From the root directory:
```bash
npm test
```

### Run Frontend Tests

```bash
npm test --workspace=frontend
```

### Run Backend Tests

```bash
npm test --workspace=backend
```

### Watch Mode

Frontend:
```bash
cd frontend
npm run test:watch
```

Backend:
```bash
cd backend
npm run test:watch
```

## Code Quality

### Linting

Check for linting errors:
```bash
npm run lint
```

### Formatting

Format all code with Prettier:
```bash
npm run format
```

## Project Structure

```
language-learning-platform/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # TTS, STT, API services
│   │   ├── utils/           # Utility functions
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   ├── test/            # Test setup and utilities
│   │   ├── App.tsx          # Root component
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html           # HTML template
│   ├── vite.config.ts       # Vite configuration
│   ├── tsconfig.json        # TypeScript config
│   └── package.json
│
├── backend/                  # Node.js/Express backend
│   ├── src/
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── models/          # Data models
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   ├── types/           # TypeScript types
│   │   ├── test/            # Test utilities
│   │   └── index.ts         # Entry point
│   ├── vitest.config.ts     # Vitest configuration
│   ├── tsconfig.json        # TypeScript config
│   ├── .env.example         # Environment template
│   └── package.json
│
├── .kiro/                    # Kiro specs and documentation
├── package.json              # Root workspace config
├── .eslintrc.json           # ESLint configuration
├── .prettierrc.json         # Prettier configuration
├── .gitignore               # Git ignore rules
├── README.md                # Project overview
└── SETUP.md                 # This file
```

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **React Query** - Server state management
- **React Router** - Client-side routing
- **Vitest** - Unit testing
- **fast-check** - Property-based testing
- **React Testing Library** - Component testing

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Zod** - Schema validation
- **Vitest** - Unit testing
- **fast-check** - Property-based testing
- **Supertest** - API testing

## Next Steps

After completing the initial setup:

1. Review the requirements document: `.kiro/specs/language-learning-platform/requirements.md`
2. Review the design document: `.kiro/specs/language-learning-platform/design.md`
3. Follow the implementation tasks: `.kiro/specs/language-learning-platform/tasks.md`

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use, you can change them:

Frontend (in `frontend/vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    port: 5174, // Change to desired port
  },
  // ...
})
```

Backend (in `backend/.env`):
```env
PORT=3001  # Change to desired port
```

### Database Connection Issues

1. Ensure PostgreSQL is running:
```bash
pg_isready
```

2. Check your database credentials in `backend/.env`

3. Verify the database exists:
```bash
psql -l | grep language_learning
```

### Redis Connection Issues

1. Ensure Redis is running:
```bash
redis-cli ping
```

2. Check Redis configuration in `backend/.env`

3. If Redis is not available, the application will still work but without caching benefits

### Module Not Found Errors

If you encounter module resolution errors:

1. Clear node_modules and reinstall:
```bash
rm -rf node_modules frontend/node_modules backend/node_modules
npm install
```

2. Clear build caches:
```bash
rm -rf frontend/dist backend/dist
```

## Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [fast-check Documentation](https://fast-check.dev/)
