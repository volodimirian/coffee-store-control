# Coffee Store Control

## Description

Base project for coffee shop management system with FastAPI + React architecture. Includes authentication system and user roles.

## Architecture

### Backend (FastAPI)

- **Authentication**: JWT tokens, registration, login
- **User Roles**: ADMIN
- **Database**: PostgreSQL with SQLAlchemy
- **Migrations**: Alembic
- **Tests**: pytest with coverage

### Frontend (React + TypeScript)

- **Authentication**: login, registration, protected routes
- **UI**: basic components for auth system
- **API**: centralized backend communication

## Project Structure

```
backend/
├── app/
│   ├── auth/          # Authentication system
│   ├── users/         # User models and schemas
│   ├── core/          # Settings, DB, security
│   └── main.py        # FastAPI application
├── alembic/           # Database migrations
└── tests/             # Tests

web/
├── src/
│   ├── pages/         # Pages (Login, Register, Dashboard)
│   ├── shared/        # Shared components and API
│   └── routes/        # Routing and protected routes
└── package.json
```

## Quick Start

### Prerequisites

- **Backend**: Python 3.12+ and [uv](https://docs.astral.sh/uv/) package manager
- **Frontend**: Node.js 20+ and [pnpm](https://pnpm.io/) package manager
- **Database**: PostgreSQL server

### Environment Setup

1. Copy environment template:

```bash
cd backend
cp .env.example .env
```

2. Edit `.env` file with your settings:

```bash
# Required: Database URL
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname

# Required: JWT Secret (generate a secure one!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional: Customize other settings
APP_TITLE=Your API Name
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### Backend Setup

```bash
cd backend
# Install dependencies
uv install

# Run database migrations
uv run alembic upgrade head

# Start development server
uv run uvicorn app.main:app --reload
```

Backend will be available at: http://localhost:8000

### Frontend Setup

```bash
cd web
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Frontend will be available at: http://localhost:5173

### Development Commands

**Backend:**

```bash
# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=app --cov-report=html

# Format code
uv run black app/

# Type checking
uv run mypy app/
```

**Frontend:**

```bash
# Run tests
pnpm test

# Build for production
pnpm build

# Lint code
pnpm lint
```

## User Roles

- **ADMIN**: System administrator
- **SUPPLIER**: Product supplier/creator
- **BUYER**: Customer

## Configuration

All configuration is managed through environment variables.

### Required Variables

- `APP_ENV`: Application environment (e.g., "dev", "prod")
- `APP_TITLE`: API title
- `APP_VERSION`: API version
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (use strong random value in production)
- `CORS_ORIGINS`: Allowed origins for CORS (JSON array format)

### Optional Variables

- `CORS_CREDENTIALS`: Allow credentials in CORS requests (default: true)
- `JWT_ALG`: JWT algorithm (default: "HS256")
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time (default: 60)
- `DB_ECHO`: Log SQL queries for debugging (default: false)

See `.env.example` for full configuration options and examples.

## What's Ready

- ✅ Authentication system (JWT)
- ✅ User roles
- ✅ Basic project architecture
- ✅ Tests for auth and core modules
- ✅ Frontend with authentication

## What Can Be Added

- Business logic for specific domain
- Additional roles and permissions
- APIs for main entities
- Extended UI

## Context

У нас портал в котором на FE используется языковая модель для переключения языков поэтому мы не хардкодим яыковые строки. Так же в коде мы не используем русский язык, а только английский. Основной язык интерфейса у нас русский но мы еще поддерживаем английский на данный момент.
у нас на бэкенде используется Python и PostgreSQL база данных. Перед внесением изменений в код сделай быстрый скан архитектуры той части в которой ты планируешь вносить измения BE or FE, что бы понимать, что и где используется и избежать дубликатов кода и более грамматно вноисить изменения в код. Так же у нас используются система прав доступа, если нужно что-то закрыть то предварительно спроси на сколько нужно добавлять права доступа на бэкенде и стоит ли функционл блокировать на фронтенде прежде чем вносить измения в код. Та кже мы испоьлзуем переменные окружения для глобальных настроек и поддерживаем их через .env.example для понимания какие нужно вносить на продакшене в .env - эта система работает и на бэкенде и на фронтенде. На фронтенде так же мы используем модальные окна и прежде чем добавлять новое окно - возможно стоит проверить можем ли мы с минимальными исправлениями переиспользывать уже созданное модальное окно.
Еще имей ввиду что у меня всегда запущен бэкенд и фронтенд и не нужно их перезапускать и тратить токены на то что бы пытаться их запустить. Ты можешь сразу пытаться все проверять без дополнительного запуска. Во фронтенде есть еще папка shared где у меня и хранятся функции и контроллеры которые переиспользуются в том числе использование и организация API запросов, константы и структуры, функции помошники и т.д. Проверь эту папку прежде чем вносить изменения что бы построить более грамматную структуру внесения изменений. Так же имей ввиду что у нас есть приход и расход приход товаров идет через invoice подобные компоненты и расход идет через expense подобные компоненты. Если нужно сделать что-то с эим свзяанное проверь архитектуру как уже построены методы и модели прежде чем предлагать решение.

------ ///// -------- //// вставить задачу ------ /// --------- /////

если есть какие то вопросы перед началом работ или нужны какие-то уточнения то сначала задай их прежде чем начинать работу и в течение работы над этим функционалом если возникют непонятные ситуации или вещи что нужно уточнить тоже задавай вопрос для уточнения прежде чем продолжать работу чтобы мы шли в одном русле.
