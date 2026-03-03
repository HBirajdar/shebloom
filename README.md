# 🌸 SheBloom — Women's Health & Wellness Platform

> **Enterprise-grade full-stack application** for women's health tracking, period management, pregnancy monitoring, doctor discovery, and wellness — built for the Indian market.

![Version](https://img.shields.io/badge/version-1.0.0-pink)
![License](https://img.shields.io/badge/license-MIT-purple)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![React](https://img.shields.io/badge/react-18.3-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.4-blue)
![Docker](https://img.shields.io/badge/docker-ready-blue)

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Monitoring & Logging](#monitoring--logging)
- [Contributing](#contributing)
- [License](#license)

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│   ┌──────────┐   ┌──────────┐   ┌──────────────────────┐   │
│   │ Web App  │   │ iOS App  │   │   Android App        │   │
│   │ (React)  │   │ (RN)     │   │   (React Native)     │   │
│   └────┬─────┘   └────┬─────┘   └──────────┬───────────┘   │
└────────┼──────────────┼─────────────────────┼───────────────┘
         │              │                     │
    ┌────▼──────────────▼─────────────────────▼────┐
    │              NGINX / Load Balancer            │
    │        (SSL Termination, Rate Limiting)       │
    └────────────────────┬─────────────────────────┘
                         │
    ┌────────────────────▼─────────────────────────┐
    │            API GATEWAY (Express.js)           │
    │   ┌──────────────────────────────────────┐   │
    │   │  Auth │ Users │ Cycles │ Doctors │ ...│   │
    │   │  JWT  │ RBAC  │ Helmet │ CORS    │   │   │
    │   └──────────────────────────────────────┘   │
    └──┬──────────┬──────────┬──────────┬──────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼────────┐
  │Postgres│ │ Redis │ │  S3   │ │ SendGrid/  │
  │(Prisma)│ │(Cache)│ │(Files)│ │ Twilio     │
  └────────┘ └───────┘ └───────┘ └────────────┘
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18.3 | UI Library |
| TypeScript 5.4 | Type Safety |
| Vite 5 | Build Tool |
| React Router v6 | Client Routing |
| Zustand | State Management |
| React Query (TanStack) | Server State |
| Tailwind CSS 3.4 | Styling |
| Framer Motion | Animations |
| React Hook Form + Zod | Form Validation |
| Vitest + RTL | Testing |
| PWA (Workbox) | Offline Support |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 20 LTS | Runtime |
| Express.js 4 | HTTP Framework |
| TypeScript 5.4 | Type Safety |
| Prisma ORM | Database ORM |
| PostgreSQL 16 | Primary Database |
| Redis 7 | Caching & Sessions |
| JWT + bcrypt | Authentication |
| Zod | Request Validation |
| Winston | Logging |
| Jest + Supertest | Testing |
| Swagger/OpenAPI | API Docs |
| Bull | Job Queue |

### DevOps & Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Compose | Containerization |
| GitHub Actions | CI/CD |
| Nginx | Reverse Proxy |
| AWS / GCP / Azure | Cloud Hosting |
| Terraform | IaC (Optional) |
| Prometheus + Grafana | Monitoring |
| Sentry | Error Tracking |

---

## ✨ Features

### Core Modules
- **🔐 Authentication** — Phone OTP (Twilio), Email/Password, Google OAuth, Apple Sign-In
- **🩸 Period Tracker** — Cycle prediction, fertile window, ovulation, symptom logging
- **🤰 Pregnancy Tracker** — Week-by-week tracking, checklists, baby development
- **💆 Wellness Hub** — Meditation, yoga, stress management, daily insights
- **👩‍⚕️ Doctor Directory** — Search, filter, book appointments, chat
- **🏥 Hospital Finder** — Compare prices, ratings, nearby hospitals
- **📰 Article Engine** — Doctor-authored, personalized recommendations
- **📊 Health Dashboard** — Mood, water, sleep, activity tracking
- **🔔 Smart Notifications** — Reminders, predictions, health tips
- **🌐 Multi-language** — Hindi, English, Tamil, Kannada, Telugu, Marathi

---

## 🚀 Getting Started

### Prerequisites

```bash
node >= 20.0.0
npm >= 10.0.0
docker >= 24.0
docker-compose >= 2.20
postgresql >= 16 (or use Docker)
redis >= 7 (or use Docker)
```

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/your-org/shebloom.git
cd shebloom

# Copy environment files
cp .env.example .env
cp src/client/.env.example src/client/.env
cp src/server/.env.example src/server/.env

# Start all services
docker compose up -d

# Run database migrations
docker compose exec api npx prisma migrate deploy

# Seed initial data
docker compose exec api npx prisma db seed

# Application is now running:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/api-docs
```

### Manual Setup

```bash
# Install dependencies
npm install          # Root workspace
cd src/client && npm install
cd ../server && npm install

# Setup database
cd src/server
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Start development
cd ../..
npm run dev          # Starts both client & server
```

---

## 📁 Project Structure

```
shebloom/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, test, build on PR
│       ├── cd-staging.yml         # Deploy to staging
│       └── cd-production.yml      # Deploy to production
├── docker/
│   ├── Dockerfile.client          # Frontend container
│   ├── Dockerfile.server          # Backend container
│   └── Dockerfile.nginx           # Nginx container
├── nginx/
│   └── nginx.conf                 # Reverse proxy config
├── docs/
│   ├── API.md                     # API documentation
│   ├── ARCHITECTURE.md            # System design doc
│   ├── DEPLOYMENT.md              # Deployment guide
│   └── CONTRIBUTING.md            # Contribution guide
├── scripts/
│   ├── setup.sh                   # First-time setup
│   ├── deploy.sh                  # Deployment script
│   └── seed-data.sh               # Database seeding
├── src/
│   ├── client/                    # React Frontend
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/            # Images, fonts, icons
│   │   │   ├── components/
│   │   │   │   ├── auth/          # Login, Register, OTP
│   │   │   │   ├── common/        # Button, Input, Modal, Toast
│   │   │   │   ├── dashboard/     # CycleCard, MoodTracker, Insights
│   │   │   │   ├── doctors/       # DoctorCard, DoctorSearch
│   │   │   │   ├── hospitals/     # HospitalCard, PriceCompare
│   │   │   │   ├── layout/        # Header, TabBar, PageLayout
│   │   │   │   ├── pregnancy/     # WeekTracker, Checklist
│   │   │   │   ├── profile/       # ProfileHero, Settings
│   │   │   │   ├── tracker/       # Calendar, SymptomLogger
│   │   │   │   ├── wellness/      # ActivityCard, WellnessHub
│   │   │   │   └── articles/      # ArticleCard, ArticleReader
│   │   │   ├── context/           # Auth, Theme, App context
│   │   │   ├── hooks/             # useAuth, useCycle, useFetch
│   │   │   ├── pages/             # Route-level page components
│   │   │   ├── services/          # API service layer
│   │   │   ├── styles/            # Global CSS, Tailwind config
│   │   │   ├── utils/             # Helpers, constants, formatters
│   │   │   ├── __tests__/         # Component & integration tests
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── server/                    # Express Backend
│       ├── src/
│       │   ├── config/            # DB, Redis, env validation
│       │   ├── controllers/       # Request handlers
│       │   ├── middleware/         # Auth, error, rate-limit, logging
│       │   ├── models/            # Prisma-generated types
│       │   ├── routes/            # API route definitions
│       │   ├── services/          # Business logic layer
│       │   ├── utils/             # JWT, hashing, SMS, email helpers
│       │   ├── validators/        # Zod schemas
│       │   ├── __tests__/         # Unit & integration tests
│       │   ├── app.ts             # Express app setup
│       │   └── server.ts          # Entry point
│       ├── prisma/
│       │   ├── schema.prisma      # Database schema
│       │   └── migrations/        # Migration files
│       ├── seeds/
│       │   └── index.ts           # Seed data
│       ├── tsconfig.json
│       └── package.json
├── .env.example                   # Root env template
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── docker-compose.yml             # Full stack orchestration
├── docker-compose.prod.yml        # Production overrides
├── package.json                   # Workspace root
├── tsconfig.base.json             # Shared TS config
└── README.md
```

---

## ⚙️ Environment Configuration

See `.env.example` for all available variables. Key configurations:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | ✅ |
| `TWILIO_SID` | Twilio Account SID for OTP | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | ✅ |
| `TWILIO_PHONE` | Twilio Phone Number | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ⬜ |
| `SENDGRID_API_KEY` | SendGrid for emails | ⬜ |
| `AWS_S3_BUCKET` | S3 bucket for file uploads | ⬜ |
| `SENTRY_DSN` | Sentry error tracking | ⬜ |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Frontend tests with coverage
cd src/client && npm run test:coverage

# Backend tests with coverage
cd src/server && npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# Linting
npm run lint

# Type checking
npm run typecheck
```

**Testing Strategy:**
- Unit tests: Components, services, utilities (>80% coverage target)
- Integration tests: API endpoints, database queries
- E2E tests: Critical user flows (auth, period logging, booking)
- Performance tests: Load testing with k6

---

## 🚢 Deployment

### Docker Production Build

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### AWS Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed guides on:
- AWS ECS + Fargate
- AWS EC2 + Docker
- Google Cloud Run
- DigitalOcean App Platform
- Vercel (Frontend) + Railway (Backend)

---

## 📡 API Documentation

Interactive API docs available at `/api-docs` (Swagger UI) when the server is running.

Key API endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/otp/send` | Send OTP to phone |
| POST | `/api/v1/auth/otp/verify` | Verify OTP |
| GET | `/api/v1/users/me` | Get current user profile |
| PUT | `/api/v1/users/me` | Update profile |
| GET | `/api/v1/cycles` | Get user's cycle data |
| POST | `/api/v1/cycles/log` | Log period/symptoms |
| GET | `/api/v1/cycles/predict` | Get predictions |
| GET | `/api/v1/pregnancy/current` | Get pregnancy status |
| POST | `/api/v1/pregnancy/checklist` | Update checklist |
| GET | `/api/v1/doctors` | List/search doctors |
| POST | `/api/v1/appointments` | Book appointment |
| GET | `/api/v1/hospitals` | List/search hospitals |
| GET | `/api/v1/articles` | Get articles |
| GET | `/api/v1/articles/recommended` | Personalized feed |
| POST | `/api/v1/mood` | Log mood |
| GET | `/api/v1/wellness` | Get wellness activities |
| GET | `/api/v1/insights/daily` | Daily health insights |

---

## 🔒 Security

- **Authentication**: JWT with refresh tokens, OTP via Twilio
- **Authorization**: Role-based access control (User, Doctor, Admin)
- **Encryption**: bcrypt password hashing, AES-256 for sensitive health data
- **Transport**: TLS 1.3 enforced, HSTS headers
- **Input Validation**: Zod schemas on every endpoint
- **Rate Limiting**: Express rate-limit + Redis sliding window
- **CORS**: Strict origin allowlist
- **Headers**: Helmet.js security headers
- **SQL Injection**: Prisma parameterized queries
- **XSS**: Content-Security-Policy headers, sanitized output
- **HIPAA Alignment**: Audit logging, data encryption at rest
- **GDPR/DPDPA Compliance**: Data export, deletion, consent management

---

## 📊 Monitoring & Logging

- **Application Logs**: Winston → CloudWatch / ELK
- **Error Tracking**: Sentry integration
- **APM**: Prometheus metrics + Grafana dashboards
- **Health Checks**: `/api/health` and `/api/ready` endpoints
- **Uptime**: Pingdom / UptimeRobot integration

---

## 🤝 Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes, write tests, commit
git add .
git commit -m "feat: add cycle prediction algorithm"

# Push and create PR
git push origin feature/your-feature
```

We follow [Conventional Commits](https://www.conventionalcommits.org/).

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">Made with 💝 in India for every woman's well-being</p>
