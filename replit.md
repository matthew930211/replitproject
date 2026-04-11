# Bidder Management Platform

## Overview

Full-stack Bidder Management Platform with role-based access control, daily work reporting, real-time chat, online presence indicators, and bidder profile management.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Clerk (`@clerk/react`, `@clerk/express`)
- **File storage**: Replit Object Storage (`@workspace/object-storage-web`)
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui components
- **Build**: esbuild (CJS bundle)

## Architecture

### Artifacts
- **API Server** (`artifacts/api-server/`): Express 5 backend at port 8080, protected by Clerk middleware
- **Bidder App** (`artifacts/bidder-app/`): React + Vite frontend at port 20908, previewPath: `/`

### Packages
- `lib/db/`: Drizzle ORM schema and queries
- `lib/api-spec/`: OpenAPI YAML spec (`openapi.yaml`)
- `lib/api-client-react/`: Generated React Query hooks (from Orval codegen)
- `lib/object-storage-web/`: Object storage upload hook (`useUpload`)

### Database Schema (PostgreSQL)
- `users`: id, clerkId, email, name, role (CHIEF_ADMIN/BIDDER_MANAGER/BIDDER), isActive, createdAt
- `reports`: id, bidderId, reportDate, projectsCount, projectsBid, outcomes, notes, createdAt
- `feedback`: id, reportId, authorId, content, createdAt
- `messages`: id, senderId, content, createdAt
- `presence`: id, userId, lastSeenAt
- `bidder_profiles`: id, userId, bio, phone, address, birthDate, skills, experience, photoObjectPath, resumeObjectPath, resumeFileName

### Roles
- **CHIEF_ADMIN**: Full access - all reports, user management, all profiles, chat
- **BIDDER_MANAGER**: Reports (all), profiles (all), chat, user management read
- **BIDDER**: Own reports, own profile, chat

## Key API Endpoints
- `POST /api/users/sync` — Auto-register Clerk user in DB after sign-in
- `GET /api/users/me` — Get current user with role
- `GET/POST /api/reports` — List/create daily reports
- `GET/POST /api/reports/:reportId/feedback` — Report feedback thread
- `GET/POST /api/messages` — Chat messages (poll every 3s)
- `POST /api/presence` — Heartbeat (every 60s)
- `GET /api/presence` — List online users
- `GET/PUT /api/profiles/:userId` — Bidder profiles
- `GET /api/stats` — Dashboard stats
- `POST /api/storage/uploads/request-url` — Presigned upload URL

## Key Commands
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Features
- **Authentication**: Clerk auth with auto-sync to DB on first sign-in
- **Daily Reports**: Bidders submit reports with projects bid, outcomes, notes
- **Feedback Thread**: Admins/managers add inline feedback on reports
- **Real-time Chat**: Team chat with 3-second polling
- **Online Presence**: Heartbeat every 60s; "Who's Online" sidebar showing last 2 min
- **Bidder Profiles**: Photo + resume upload, bio, skills, experience
- **User Management**: Chief Admin can change roles and activate/deactivate users
- **Dashboard**: Role-aware stats overview
