# Keke backend Ã¢â‚¬â€ Phase 1

Backend only: sign in, refresh/logout sessions, identify the current user, and protect account provisioning with roles.

## What you are learning

- **NestJS** organizes code into modules, controllers, and services. Controllers define HTTP routes; services hold application logic; guards decide whether a request may continue.
- **PostgreSQL** stores durable user records. Passwords are stored as bcrypt hashes, never as plain text. The schema is created through a versioned TypeORM migration.
- **Redis** stores short-lived refresh-session state. Refresh rotates the session identifier atomically; logout revokes it. Redis is not the source of truth for users.

## Roles

`ADMIN`, `SUBADMIN`, `EMPLOYER`, and `MANAGER` are stored in the `roles` table. The migration seeds those four rows, and each user references one through `users.role_id`. Phase 1 uses `ADMIN` to create accounts. The rest of the role permissions need product rules before they can safely be assigned.

## Run locally

Requirements: Node.js 22+, npm, and Docker Desktop.

1. Copy `.env.example` to `.env`. Replace both JWT secrets with different random values of at least 32 characters and change the bootstrap admin password.
2. Start the data services: `docker compose up -d`.
3. Install packages: 
pm install`.
4. Create the tables: 
pm run db:migrate`.
5. Start the API: 
pm run start:dev`.

The server listens on port 3000. Swagger UI: `http://localhost:3000/docs`. OpenAPI JSON: `http://localhost:3000/docs-json`. Health check: `GET http://localhost:3000/api/v1/health`.

## API

- `POST /api/v1/auth/login` Ã¢â‚¬â€ `{ "email": "...", "password": "..." }`
- `POST /api/v1/auth/refresh` Ã¢â‚¬â€ `{ "refreshToken": "..." }`; returns a new access and refresh token pair. Each refresh token works once.
- `POST /api/v1/auth/logout` Ã¢â‚¬â€ `{ "refreshToken": "..." }`; revokes the active refresh session.
- `GET /api/v1/auth/me` Ã¢â‚¬â€ requires `Authorization: Bearer <accessToken>`.
- `POST /api/v1/users` Ã¢â‚¬â€ requires an admin access token; body: `{ "email": "...", "password": "at-least-12-chars", "role": "EMPLOYER" }`.

New users cannot self-register. On first startup, the server creates the admin from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`, if that email does not already exist. Remove those two values after the first admin has been created; do not use the example values outside local development.

## Code map

- `src/auth/auth.controller.ts`: login, refresh, logout, and current-user routes.
- `src/auth/auth.service.ts`: token creation and Redis-backed refresh rotation.
- `src/auth/guards/access-token.guard.ts`: validates the access token and reloads the active user from PostgreSQL.
- `src/auth/guards/roles.guard.ts`: checks role metadata set with `@Roles(...)`.
- `src/users/user.entity.ts`: PostgreSQL user model with a foreign key to its role.
- `src/roles/role.entity.ts`: PostgreSQL role table model.
- `src/database/migrations/1710000000000-InitialAuthSchema.ts`: creates and seeds `roles`, then creates `users`.
- `src/database/migrations/`: versioned schema changes.
- `src/redis/redis.service.ts`: Redis connection lifecycle.
- `src/config/environment.schema.ts`: required environment variables and validation rules.
- `src/config/database.config.ts`: PostgreSQL connection options, kept out of the root module.
- `src/main.ts`: app startup, request validation, and Swagger setup.

## Phase 1 boundaries

No frontend, password reset, email verification, MFA, organization/workspace model, or detailed per-role business permissions are included yet. Define those rules before expanding the role guard.
