# OrigAMI — Commandes utiles

Monorepo npm workspaces avec deux apps :
- `apps/api` — Backend NestJS + Prisma + PostgreSQL
- `apps/web` — Frontend Next.js + NextAuth

---

## Prérequis

- Node.js 20+
- npm 10+
- Docker (pour la base de données PostgreSQL)

---

## Installation

Installer toutes les dépendances depuis la racine du projet :

```bash
npm install
```

---

## Base de données (Docker)

Le projet utilise PostgreSQL via Docker. Le fichier `docker-compose.yml` est à la racine.

```bash
# Démarrer la base de données
docker compose up -d

# Arrêter la base de données
docker compose down

# Arrêter et supprimer les données (repart de zéro)
docker compose down -v
```

> La base tourne sur `localhost:5432`, base `origami`, user `postgres`.

---

## Déploiement Docker complet

Le dépôt peut maintenant démarrer toute la stack avec Docker :
- `postgres` pour la base
- `api` pour NestJS + Prisma
- `web` pour Next.js

### Préparer les variables

Renseigner au minimum :

`apps/api/.env`
```env
API_PORT=4000
API_HOST=0.0.0.0
CORS_ORIGIN=http://<IP_DU_VPS>:3000
FRONTEND_URL=http://<IP_DU_VPS>:3000
API_URL=http://<IP_DU_VPS>:4000
DATABASE_URL=postgresql://postgres:<MOT_DE_PASSE>@postgres:5432/origami
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=24h
APP_URL=http://<IP_DU_VPS>:3000
```

`apps/web/.env`
```env
NEXTAUTH_URL=http://<IP_DU_VPS>:3000
NEXTAUTH_SECRET=change_me_in_production
NEXT_PUBLIC_API_URL=http://<IP_DU_VPS>:4000
```

Si tu veux changer le mot de passe PostgreSQL, exporte aussi `POSTGRES_PASSWORD` avant le lancement ou crée un fichier `.env` à la racine pour Docker Compose.

### Lancer toute la stack

```bash
docker compose up -d --build
```

Cela :
- build l'API et le front
- démarre PostgreSQL
- applique `prisma db push` au démarrage de l'API
- exécute le seed Prisma automatiquement par défaut
- démarre le site sur `http://<IP_DU_VPS>:3000`

### Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Relancer après modification
docker compose up -d --build

# Arrêter
docker compose down

# Arrêter et supprimer aussi les données PostgreSQL
docker compose down -v
```

### Notes

- Le seed Prisma est lancé au démarrage de l'API via `RUN_DB_SEED=true`.
- Pour désactiver le seed automatique : `RUN_DB_SEED=false docker compose up -d --build`
- Les uploads de l'API sont persistés dans le volume Docker `api_uploads`.

---

## Variables d'environnement

Copier le fichier d'exemple et le remplir :

```bash
cp .env.example apps/api/.env
```

Créer ensuite `apps/web/.env.local` avec :

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=une_valeur_secrete
```

Ajoutez aussi dans `apps/api/.env` pour LiveKit Cloud :

```env
SESSION_VIDEO_PROVIDER=livekit
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=<your_livekit_api_key>
LIVEKIT_API_SECRET=<your_livekit_api_secret>
```

Puis configurez dans LiveKit Cloud un webhook vidéo vers :

```text
POST http://localhost:4000/sessions/provider/webhooks/video/livekit
```

---

## API — NestJS (`apps/api`)

Toutes ces commandes se lancent depuis `apps/api/` :

```bash
cd apps/api
```

### Développement

```bash
# Lancer le serveur en mode watch (rechargement automatique)
npm run start:dev

# Lancer le serveur sans watch
npm run start

# Lancer en mode debug (port 9229)
npm run start:debug
```

### Build & Production

```bash
# Compiler le projet (génère aussi le client Prisma)
npm run build

# Lancer la version compilée
npm run start:prod
```

### Qualité

```bash
# Linter avec correction automatique
npm run lint

# Formater le code avec Prettier
npm run format
```

### Tests

```bash
# Lancer tous les tests unitaires
npm run test

# Mode watch (relance les tests à chaque modification)
npm run test:watch

# Rapport de couverture de code
npm run test:cov

# Tests end-to-end
npm run test:e2e
```

---

## Prisma (`apps/api`)

Prisma est l'ORM qui fait le lien entre le code TypeScript et la base PostgreSQL.
Le schéma est dans `apps/api/prisma/schema.prisma`.

Toutes ces commandes se lancent depuis `apps/api/` :

```bash
cd apps/api
```

### Générer le client Prisma

```bash
npm run prisma:generate
```

> A faire obligatoirement après chaque modification du `schema.prisma`.
> Génère le client TypeScript typé dans `node_modules/@prisma/client`.

### Migrations

```bash
# Créer et appliquer une migration en développement
npm run prisma:migrate
```

> Prisma compare le schéma actuel à la base, génère un fichier SQL de migration
> dans `prisma/migrations/`, et l'applique. À utiliser pendant le développement.

```bash
# Pousser le schéma directement sans créer de fichier de migration
npm run prisma:push
```

> Plus rapide que `migrate` mais ne crée pas d'historique de migration.
> Utile pour du prototypage rapide ou pour resynchroniser la base après un `down -v`.

### Seed — Peupler la base de données

```bash
npm run prisma:seed
```

> Lance le fichier `prisma/seed.ts` qui insère les données de référence
> (domaines, compétences, etc.) nécessaires au bon fonctionnement de l'app.
> A relancer à chaque fois que la base est réinitialisée.

### Prisma Studio — Interface graphique

```bash
npm run prisma:studio
```

> Ouvre une interface web sur `http://localhost:5555` pour visualiser
> et modifier les données directement dans la base de données.

### Workflow complet de démarrage (premier lancement ou reset)

```bash
# 1. Démarrer la base
docker compose up -d

# 2. Appliquer le schéma
npm run prisma:push

# 3. Générer le client TypeScript
npm run prisma:generate

# 4. Peupler la base avec les données de référence
npm run prisma:seed

# 5. Lancer l'API
npm run start:dev
```

---

## Site web — Next.js (`apps/web`)

Toutes ces commandes se lancent depuis `apps/web/` :

```bash
cd apps/web
```

### Développement

```bash
# Lancer le serveur de développement
npm run dev
```

> Disponible sur `http://localhost:3000` avec rechargement à chaud.

### Build & Production

```bash
# Compiler pour la production
npm run build

# Lancer la version compilée
npm run start
```

### Qualité & Tests

```bash
# Linter
npm run lint

# Tests unitaires (Vitest)
npm run test
```

---

## Ordre de lancement pour le développement

Ouvrir trois terminaux :

```bash
# Terminal 1 — Base de données
docker compose up -d

# Terminal 2 — API (depuis apps/api/)
npm run start:dev

# Terminal 3 — Site web (depuis apps/web/)
npm run dev
```

| Service     | URL                        |
|-------------|----------------------------|
| Site web    | http://localhost:3000      |
| API         | http://localhost:4000      |
| Prisma Studio | http://localhost:5555    |
| PostgreSQL  | localhost:5432             |


## Commande webhook stripe

```bash
stripe listen --events checkout.session.completed,payment_intent.payment_failed --forward-to localhost:4000/payments/webhook
```
