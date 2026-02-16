# Story 1.11: Layout app authentifie (sidebar, header, navigation)

Status: review

<!-- Note: Story dediee pour le layout global des pages authentifiees. Prerequis pour toutes les stories d'epic 2+. -->

## Story

As a utilisateur connecte (etudiant, mentor, admin),
I want voir un layout coherent avec sidebar de navigation, header et zone de contenu,
so that naviguer facilement entre les sections de la plateforme.

## Acceptance Criteria

1. Given un utilisateur connecte When il accede a une page authentifiee Then il voit une sidebar de navigation a gauche avec les 5 items: Tableau de bord, Mentors, Projets, Messages, Calendrier
2. Given un utilisateur connecte When il regarde le header Then il voit le logo Orig'AMI au centre et son nom + role en haut a droite dans un badge orange
3. Given un utilisateur connecte When il clique sur un item de la sidebar Then il est redirige vers la section correspondante et l'item actif est visuellement mis en evidence
4. Given un utilisateur sur mobile (< 768px) When il accede a une page authentifiee Then la sidebar est masquee et accessible via un bouton hamburger
5. Given un utilisateur connecte When il accede au dashboard Then le layout encapsule la page existante sans casser le contenu actuel

## Tasks / Subtasks

- [x] Creer le composant Sidebar avec navigation et items actifs (AC: #1, #3)
  - [x] 5 items de navigation avec icones Lucide (Home, GraduationCap, FolderOpen, MessageSquare, Calendar)
  - [x] Fond bleu fonce (--color-primary-900), icones et texte blanc
  - [x] Item actif avec fond plus clair et indicateur visuel
  - [x] Integration avec usePathname() pour detection de la page active
- [x] Creer le composant AppHeader avec logo et profil utilisateur (AC: #2)
  - [x] Logo Orig'AMI centre (version couleur)
  - [x] Badge profil en haut a droite: avatar/initiales + nom + role, fond orange (--color-accent-500)
  - [x] Donnees utilisateur depuis la session NextAuth
- [x] Creer le layout.tsx dans (app)/ qui combine sidebar + header + zone contenu (AC: #5)
  - [x] Structure: sidebar fixe a gauche + header fixe en haut + main content scrollable
  - [x] Le layout encapsule toutes les pages du groupe (app)
  - [x] Ne pas casser les pages existantes (dashboard, profil, preferences, admin)
- [x] Responsive: sidebar en drawer sur mobile (AC: #4)
  - [x] Bouton hamburger dans le header sur mobile
  - [x] Overlay + drawer pour la sidebar
  - [x] Fermeture au clic sur un lien ou en dehors
- [x] Tests unitaires des composants Sidebar et AppHeader (AC: #1-5)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + React 19, TypeScript.
- Auth: NextAuth 4.x + JWT. Session accessible via useSession() cote client et getServerSession() cote serveur.
- Conventions: composants dans `components/ui/` ou `components/layout/`, CSS modules, tokens CSS de globals.css.
- UX: responsive + WCAG 2.1 AA.
- Reference visuelle: `doc_origami/maquette/Etudiant V2.jpg`

### Maquette de reference (Etudiant V2.jpg)

- **Sidebar** : ~80px de large, fond bleu fonce (#00064F ou --color-primary-900), icones blanches avec label en dessous, 5 items verticaux
- **Header** : fond blanc, logo Orig'AMI couleur (jaune+bleu) centre, badge profil orange en haut a droite avec nom complet + "Profil Etudiant"
- **Titre de page** : badge orange arrondi avec texte blanc (ex: "Tableau de Bord")
- **Zone contenu** : fond gris tres clair (--color-neutral-50), cartes blanches avec bordures

### Structure de fichiers recommandee

- `apps/web/src/components/layout/Sidebar.tsx` + `.module.css`
- `apps/web/src/components/layout/AppHeader.tsx` + `.module.css`
- `apps/web/src/components/layout/index.ts`
- `apps/web/src/app/(app)/layout.tsx` (layout wrapper)

### Items de navigation sidebar

| Label | Icone Lucide | Route |
|-------|-------------|-------|
| Tableau de bord | Home | /dashboard |
| Mentors | GraduationCap | /mentors |
| Projets | FolderOpen | /projets |
| Messages | MessageSquare | /messages |
| Calendrier | Calendar | /calendrier |

### Design tokens a utiliser

- Sidebar fond: `--color-primary-900`
- Sidebar texte/icones: `--color-white`
- Sidebar item actif: `--color-primary-700` (fond plus clair)
- Header fond: `--color-white`
- Badge profil fond: `--color-accent-500`
- Badge profil texte: `--color-white`
- Zone contenu fond: `--color-neutral-50`
- Toutes les couleurs via variables CSS, AUCUN hex en dur

### Session NextAuth

Les donnees utilisateur sont disponibles via :
```typescript
// Client component
const { data: session } = useSession();
session.user.firstName // prenom
session.user.lastName  // nom
session.user.roles     // ['etudiant'] | ['mentor'] | ['admin']

// Server component
const session = await getServerSession(authOptions);
```

### Do / Don't

- Do: utiliser les composants Button, Card etc. de components/ui/ si besoin dans le layout
- Do: s'assurer que le layout ne casse pas les pages existantes (dashboard, profil, admin)
- Do: sidebar responsive en drawer sur mobile
- Don't: couleurs hex en dur - uniquement variables CSS
- Don't: dupliquer les composants UI existants
- Don't: bloquer le contenu principal si la sidebar est ouverte sur mobile

### Bloque

- Stories 2.1, 2.2, 2.3, 2.4 (pages Mentors dans la sidebar)
- Stories 3.x (Messages dans la sidebar)
- Stories 4.x (Projets/Parcours dans la sidebar)

### References

- doc_origami/maquette/Etudiant V2.jpg (maquette de reference principale)
- doc_origami/maquette/Mentors recherche.jpg (meme layout, page Mentors)
- docs/project-context.md (design system et regles)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- **Sidebar** : 5 items de navigation (Tableau de bord, Mentors, Projets, Messages, Calendrier) avec icones Lucide. Fond --color-primary-900, item actif avec --color-primary-700 + bordure --color-accent-500. Detection automatique via usePathname(), support routes imbriquees. aria-current="page" sur l'item actif, aria-label sur le aside.
- **AppHeader** : Logo Orig'AMI centre, badge profil orange (--color-accent-500) en haut a droite avec initiales + nom complet + role (Profil Etudiant/Mentor/Administrateur). Donnees de session NextAuth via useSession(). Lien vers /profil sur le badge.
- **Layout (app)/** : Client component avec SessionProvider, sidebar fixe (80px) a gauche + header fixe (64px) en haut + zone contenu scrollable fond --color-neutral-50. Encapsule toutes les pages authentifiees.
- **Responsive** : Sur mobile (<768px), sidebar masquee, accessible via bouton hamburger dans le header. Overlay semi-transparent + drawer avec transition CSS. Fermeture au clic sur un lien (onClose) ou sur l'overlay.
- **Compatibilite** : Pages existantes (dashboard, profil, admin, preferences-notifications, profile-suggestion, besoins, consentement) adaptees — remplacement des `<main>` internes par `<div>`, suppression des backgrounds/min-height redondants.
- **Tests** : 16 tests unitaires (8 Sidebar + 8 AppHeader) avec Vitest + Testing Library. Couverture : rendu des 5 items, liens corrects, item actif (aria-current), routes imbriquees, overlay, hamburger, badge profil, initiales, roles, non-authentifie.
- **Build** : `next build` reussi sans erreurs TypeScript ni warnings. 2 tests web pre-existants en echec (home-page.test, OnboardingWizard redirect) — non lies a cette story.
- **API** : 162 tests backend passes, 0 regressions.

### File List

- `apps/web/src/components/layout/Sidebar.tsx` (new)
- `apps/web/src/components/layout/Sidebar.module.css` (new)
- `apps/web/src/components/layout/AppHeader.tsx` (new)
- `apps/web/src/components/layout/AppHeader.module.css` (new)
- `apps/web/src/components/layout/index.ts` (new)
- `apps/web/src/components/layout/__tests__/Sidebar.test.tsx` (new)
- `apps/web/src/components/layout/__tests__/AppHeader.test.tsx` (new)
- `apps/web/src/app/(app)/layout.tsx` (new)
- `apps/web/src/app/(app)/layout.module.css` (new)
- `apps/web/src/app/(app)/dashboard/page.tsx` (modified - main→div)
- `apps/web/src/app/(app)/dashboard/page.module.css` (modified - removed min-height/background)
- `apps/web/src/app/(app)/profil/page.tsx` (modified - main→div)
- `apps/web/src/app/(app)/profil/page.module.css` (modified - removed min-height/background)
- `apps/web/src/app/(app)/profile-suggestion/page.tsx` (modified - main→div)
- `apps/web/src/features/admin/users/AdminUsersManager.tsx` (modified - main→div)
- `apps/web/src/features/admin/users/AdminUsersManager.module.css` (modified - removed min-height/background)
- `apps/web/src/features/notifications/preferences/NotificationPreferencesForm.tsx` (modified - main→div)
- `apps/web/src/features/notifications/preferences/NotificationPreferencesForm.module.css` (modified - removed min-height/background)

### Change Log

- 2026-02-16: All 5 tasks + subtasks implemented and tested. 16 web tests pass, 162 API tests pass, 0 regressions. Build succeeds.
