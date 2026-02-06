# Project Context - Orig'AMI

## Project Structure

```
site/
├── apps/
│   ├── web/          # Next.js frontend (App Router)
│   └── api/          # NestJS backend API
├── packages/
│   └── shared/       # Shared types and schemas (@origami/shared)
├── docs/             # Project documentation
├── _bmad-output/     # BMAD artifacts (planning, implementation)
└── _bmad/            # BMAD configuration
```

## Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend:** NestJS 11, TypeScript
- **Database:** PostgreSQL 17 + Prisma ORM
- **Auth:** NextAuth 4.x + JWT + RBAC
- **State:** Zustand, TanStack Query, React Hook Form

## Conventions

### Naming
- Database: `snake_case` (tables, columns)
- JSON/API: `camelCase`
- React components: `PascalCase`
- Files: `kebab-case` or `PascalCase.tsx` for components

### API Response Format
```json
{
  "data": { ... },
  "error": null
}
```
Error format:
```json
{
  "data": null,
  "error": { "code": "ERROR_CODE", "message": "Human readable", "details": {} }
}
```

### Roles
- `etudiant` - Student user
- `mentor` - Mentor user
- `admin` - Administrator
- `support` - Support staff

## Development Commands

### Web (apps/web)
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

### API (apps/api)
```bash
npm run start:dev   # Start dev server (port 4000)
npm run build       # Production build
npm run test        # Run tests
npm run lint        # ESLint
```

## Environment Variables

See `.env.example` at root for required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - NextAuth base URL
- `NEXTAUTH_SECRET` - NextAuth secret key
- `API_PORT` - NestJS API port (default: 4000)

## Branding Assets

- Main logo: `apps/web/src/app/assets/logo.png`
