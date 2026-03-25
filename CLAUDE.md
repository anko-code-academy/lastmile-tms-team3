# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

### Backend (.NET 10)
```bash
cd src/backend
dotnet restore
dotnet build --no-restore                          # debug build
dotnet build --no-restore --configuration Release  # release build
dotnet test --no-build                             # run all tests
dotnet test --no-build --filter "FullyQualifiedName~ClassName.MethodName"  # single test
dotnet run --project src/LastMile.TMS.Api           # run API locally
```

### Web (Next.js)
```bash
cd src/web
npm ci
npm run lint
npm run build
npm run dev    # dev server on port 3000
```

### Mobile (Expo)
```bash
cd src/mobile
npm ci --legacy-peer-deps   # required for WatermelonDB peer dep conflict
npx tsc --noEmit            # type check
npm start                   # Expo dev server
```

### Full Stack (Docker)
```bash
docker compose up --build   # everything at http://localhost
```

## Architecture

Monorepo with three apps: `src/backend` (API), `src/web` (dispatcher UI), `src/mobile` (driver app).

### Backend — Clean Architecture

Dependency rules enforced by `tests/LastMile.TMS.Architecture.Tests/ArchitectureTests.cs`:

```
Domain          → (no dependencies)
Application     → Domain
Infrastructure  → Application
Persistence     → Application
Api             → Application, Infrastructure, Persistence
```

- **Domain**: Entities (`BaseEntity`, `BaseAuditableEntity`), domain events (`IDomainEvent`, `IHasDomainEvents`). No framework dependencies.
- **Application**: MediatR handlers, FluentValidation validators, `ValidationBehavior` pipeline. Defines `IAppDbContext` and `ICurrentUserService` interfaces.
- **Persistence**: `AppDbContext` (EF Core + PostGIS), implements `IAppDbContext`. Entity configurations via FluentAPI, auto-discovered from assembly.
- **Infrastructure**: External services (Hangfire, SendGrid, Twilio, QuestPDF, ZXing.Net).
- **Api**: Composition root. `Program.cs` wires DI via `AddApplication()`, `AddPersistence()`, `AddInfrastructure()`.

Each layer registers its own services via an `IServiceCollection` extension method in `DependencyInjection.cs`.

### Docker Services

Caddy reverse proxy on port 80 routes: `/api/*` and `/hubs/*` and `/swagger/*` and `/hangfire*` → API (port 8080); `/seq/*` → Seq; everything else → Next.js (port 3000).

Supporting: PostgreSQL 17 + PostGIS 3.5, Redis 7, PgBouncer (transaction pooling), Seq (structured logs).

## TDD — Red, Green, Refactor

All features and bug fixes must follow the TDD cycle:

1. **Red**: Write a failing test first that defines the expected behavior. Build and confirm the test fails.
2. **Green**: Write the minimum code to make the test pass. No more than what the test requires.
3. **Refactor**: Clean up the implementation while keeping all tests green. Remove duplication, improve naming, simplify.

- Never write production code without a failing test driving it.
- Run the relevant test(s) after each step to verify the cycle: fail → pass → pass.
- Test projects mirror source projects: `Domain.Tests`, `Application.Tests`, `Api.Tests`, `Architecture.Tests`.
- Backend uses xUnit + FluentAssertions + NSubstitute. Api.Tests uses `WebApplicationFactory` for integration tests.

## Code Style

- C#: 4-space indent, nullable references enabled, implicit usings
- TypeScript: 2-space indent
- Line endings: LF (`.editorconfig` at root)
- TFM: `net10.0` (preview SDK)

## Commit Message Convention

Follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <description>

<body>

<footer>
```

**Types**: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`
**Scope**: Optional component/area (e.g., `domain`, `api`, `web`, `mobile`)
**Description**: Imperative mood, lowercase after colon

**Body** (optional):
- Bullet points describing work done
- Group related bullet points under headers if needed
- Summary paragraph describing big picture

**Footer** (optional):
- `Relates-to: LMTT3-<number>` for Jira tickets
- Other Conventional Commits footers as needed

**Important**: Do not add a `Co-Authored-By` line at the end of commit messages.

Separate sections with empty lines for readability.

**Examples**:

```
feat(domain): implement vehicle data model

- Add Vehicle entity with registration plate, type, status, capacity properties
- Add VehicleType and VehicleStatus enums
- Configure EF Core mapping with unique constraint on registration plate
- Add unit tests for domain logic
- Update Depot entity to include Vehicles collection

This implements the Vehicle Management Data Model as per LMTT3-5, enabling fleet registration and assignment to depots. The model includes capacity limits for parcel count and weight, with status tracking for availability and maintenance.

Relates-to: LMTT3-5
```

```
feat: add user authentication with multi-group example

**Backend**
- Implement JWT token generation and validation
- Add User entity with hashed password storage
- Create authentication endpoints (login, register, refresh)
- Configure ASP.NET Core Identity integration

**Frontend**
- Add login and registration forms with validation
- Implement token storage in localStorage
- Create authentication context and protected routes
- Add logout functionality and token refresh

This introduces user authentication across the full stack, enabling secure access to application features. The implementation follows security best practices with JWT tokens and proper password hashing.

Relates-to: LMTT3-7
```
