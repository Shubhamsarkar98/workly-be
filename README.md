# Keke backend - Phase 1

Backend only: authentication, refresh sessions, user roles, and admin account provisioning. The API uses GraphQL at `/graphql`, PostgreSQL for users and roles, and Redis for refresh sessions. Development can use an explicitly enabled in-memory session fallback.

## What you are learning

- **NestJS** groups operations into modules and resolvers. Resolvers handle GraphQL fields; services contain application logic; guards protect operations.
- **GraphQL** exposes one endpoint with a typed schema. Code-first TypeScript classes define the schema.
- **PostgreSQL** stores user records and roles. Passwords are stored as bcrypt hashes. A TypeORM migration creates and seeds the tables.
- **Redis** stores refresh-session state. Refresh tokens rotate atomically, and logout revokes the session.

## Roles

`ADMIN`, `SUBADMIN`, `EMPLOYER`, and `MANAGER` are stored in the `roles` table. The migration seeds those four rows, and every user references one through `users.role_id`. In Phase 1, only `ADMIN` can create accounts. Add other role permissions once their product rules are defined.

## Run locally

Requirements: Node.js 22+, npm, PostgreSQL, and a Redis server for Redis-backed sessions.

1. Copy `.env.example` to `.env`. Set the PostgreSQL username, password, and database name. Set two different JWT secrets of at least 32 characters and a bootstrap admin password of 12-72 UTF-8 bytes.
2. For Redis-backed sessions, set `REDIS_URL` to your Redis service. To develop without Redis installed, leave `REDIS_FALLBACK=memory`. This fallback is development-only, keeps sessions in process memory, and clears them when the app restarts. Production always requires Redis.
3. Install packages with `npm install`.
4. Create the tables with `npm run db:migrate`.
5. Start the API with `npm run start:dev`.

GraphQL endpoint: `http://localhost:3000/graphql`. GraphiQL is enabled outside production. Swagger remains available at `http://localhost:3000/docs` for the REST health check; OpenAPI JSON is at `http://localhost:3000/docs-json`.

## GraphQL operations

### Login

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    tokenType
    expiresIn
  }
}
```

Variables:

```json
{
  "input": {
    "email": "admin@keke.local",
    "password": "your-bootstrap-password"
  }
}
```

### Current user

```graphql
query {
  me {
    id
    email
    role
    active
  }
}
```

Send the access token in the HTTP header `Authorization: Bearer <accessToken>`.

### Create a user (admin only)

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    role
    active
  }
}
```

### Refresh and logout

`refresh(input: { refreshToken: "..." })` returns a new token pair. Each refresh token is single-use. `logout(input: { refreshToken: "..." })` revokes the active session.

New users cannot self-register. On first startup, the server creates an admin from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` if that email does not already exist. Keep those values private and remove them after the bootstrap account has been created.

## Code map

- `src/graphql/graphql.types.ts`: GraphQL inputs, outputs, and role enum.
- `src/graphql/auth.resolver.ts`: login, refresh, logout, and current-user operations.
- `src/users/users.resolver.ts`: admin-only account creation.
- `src/auth/auth.service.ts`: token creation and session rotation.
- `src/auth/guards/access-token.guard.ts`: validates access tokens for GraphQL requests.
- `src/auth/guards/roles.guard.ts`: checks role metadata set with `@Roles(...)`.
- `src/users/user.entity.ts`: user table model and role foreign key.
- `src/roles/role.entity.ts`: role table model.
- `src/database/migrations/1710000000000-InitialAuthSchema.ts`: creates users and roles, and seeds the four roles.
- `src/config/environment.schema.ts`: environment variable validation.
- `src/config/database.config.ts`: PostgreSQL connection settings.
- `src/redis/redis.service.ts`: Redis sessions and the development-only memory fallback.
- `src/main.ts`: app startup, request validation, and Swagger setup.

## Phase 1 boundaries

No frontend, password reset, email verification, MFA, organization/workspace model, or detailed per-role business permissions are included yet.