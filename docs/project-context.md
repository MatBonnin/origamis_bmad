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
- Maquettes de reference: `doc_origami/maquette/` (dashboard, mentors, onboarding)

## Design System - REGLES OBLIGATOIRES

### Reference visuelle

Le style de reference est la maquette `doc_origami/maquette/Etudiant V2.jpg` (dashboard etudiant). Toute implementation UI DOIT s'en inspirer pour les couleurs, espacements et composants.

### Couleurs - Hierarchie stricte

- **CTA / Bouton primaire** : Orange `--color-accent-500` (#F29F08) - C'est LA couleur d'action
- **Titres / Structure** : Bleu fonce `--color-primary-900` (#00064F)
- **Elements secondaires (sidebar, liens actifs)** : Bleu `--color-primary-700` (#36529B)
- **Fonds de cartes** : Bleu tres clair `--color-neutral-50` (#EBF0F7)
- **Texte courant** : `--color-neutral-700` (#525252)
- **Fond principal** : Blanc `--color-white` (#FFFFFF)

### Tokens CSS obligatoires

JAMAIS de couleurs hex codees en dur dans les fichiers CSS modules. Toujours utiliser les variables CSS definies dans `apps/web/src/app/globals.css`. Exemples :
- `var(--color-accent-500)` au lieu de `#F29F08`
- `var(--color-primary-900)` au lieu de `#00064F`
- `var(--spacing-4)` au lieu de `1rem`
- `var(--radius-lg)` au lieu de `10px`

### Composants reutilisables obligatoires

Tous les composants UI reutilisables sont dans `apps/web/src/components/ui/` :
- `Button` (variants: primary/secondary/outline/ghost, sizes: sm/md/lg)
- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Input`
- `Select`
- `ProgressBar`

**REGLE** : Toute page ou feature DOIT utiliser ces composants au lieu de recreer ses propres elements HTML avec du CSS maison. Si un composant manque, le creer dans `components/ui/` pour qu'il soit reutilisable.

### Layout app (pages post-connexion)

Les pages authentifiees (dashboard, mentors, projets, etc.) doivent suivre le layout de la maquette Etudiant V2 :
- Sidebar bleu fonce a gauche (navigation)
- Header avec logo centre + profil utilisateur en haut a droite
- Zone de contenu principale au centre
- Panneau notifications optionnel a droite

### Accessibilite

- WCAG 2.1 AA obligatoire
- Tous les elements interactifs doivent avoir `min-height: var(--min-touch-target)` (44px)
- Focus visible avec `outline: 3px solid var(--color-accent-500)`
- ARIA labels sur les elements non textuels
