# Story 1.10: Landing page vitrine coherent avec Orig'AMI

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visiteur non connecte,
I want voir une landing page claire et engageante,
so that comprendre la valeur d'Orig'AMI et acceder rapidement a l'inscription/connexion.

## Acceptance Criteria

1. Given un visiteur arrive sur `/` When la page se charge Then il voit une proposition de valeur claire, des sections de presentation, et des CTA vers `inscription` et `connexion`
2. Given un utilisateur sur mobile ou desktop When il consulte la landing Then la mise en page est responsive et accessible (contraste, focus, navigation clavier)
3. Given les conventions visuelles existantes du projet When la landing est affichee Then elle respecte l'identite visuelle et la tonalite d'Orig'AMI

## Tasks / Subtasks

- [x] Designer la structure de landing (hero, benefices, parcours, CTA) en coherence avec la maquette/ux design (AC: #1, #3)
- [x] Remplacer `apps/web/src/app/page.tsx` par la landing page finale (AC: #1, #3)
- [x] Mettre a jour `apps/web/src/app/page.module.css` avec styles responsive et accesibles (AC: #2, #3)
- [x] Ajouter navigation claire vers `connexion` et `inscription` + CTA secondaires utiles (AC: #1)
- [x] Ajouter tests UI basiques (presence sections/CTA critiques) (AC: #1, #2)
- [x] Valider coherence fonctionnelle (aucun impact regressif sur routes publiques existantes) (AC: #1, #2, #3)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + TypeScript.
- Conserver la structure App Router existante.
- Respecter conventions accessibilite (focus visibles, contraste, labels explicites).
- Ne pas introduire de dependance UI lourde non necessaire.

### UX & Contenu attendu

- Hero: titre clair + sous-titre + CTA principal inscription.
- Sections recommandeees:
- Comment ca marche (etudiants/mentors).
- Benefices / preuves (accompagnement, progression, confiance).
- Bloc CTA final.
- Footer simple avec liens utiles.

### Routes et liens

- CTA principal: `/inscription`
- CTA secondaire: `/connexion`
- Liens internes eventuels vers sections app publiques si pertinentes.

### Direction visuelle

- Coherence avec styles existants (`dashboard`, `profil`, pages publiques).
- Palette et ton Orig'AMI, sans retour au template Next par defaut.
- Responsive mobile-first.

### Testing Requirements

- Test UI: presence du hero, des CTA `inscription`/`connexion`, et d'au moins une section de contenu.
- Verification manuelle responsive (mobile + desktop).

### Do / Don't

- Do: garder un message simple et oriente utilisateur.
- Do: privilegier performance (pas de media lourde inutile).
- Don't: laisser des textes de demo Next/Vercel.
- Don't: casser les routes publiques existantes.

### References

- _bmad-output/planning-artifacts/ux-design-specification.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- doc_origami/maquette

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References
- `npm run test` (apps/web) -> PASS (3 tests: admin users, preferences notifications, landing page)

### Completion Notes List
- Landing page complete creee sur `/` avec hero, benefices, parcours en 3 etapes, CTA final et footer.
- Navigation claire ajoutee vers `/inscription` et `/connexion` dans le header et les blocs CTA.
- Styles refondus dans `page.module.css` avec responsive mobile/desktop et focus clavier visibles.
- Texte Next/Vercel par defaut supprime et remplace par un contenu coherent Orig'AMI.
- Test UI basique ajoute pour valider la presence des sections et des CTA critiques.
- Validation de non-regression effectuee via execution des tests UI web existants + nouveau test landing.

### File List
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/page.module.css`
- `apps/web/src/app/__tests__/home-page.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log
- 2026-02-06: Story 1.10 implementee, landing page Orig'AMI livree avec CTA, sections de presentation, responsive et test UI associe.
