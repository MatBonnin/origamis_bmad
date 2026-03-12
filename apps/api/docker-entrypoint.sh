#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until npx prisma db push --skip-generate; do
  echo "PostgreSQL not ready yet, retrying in 3s..."
  sleep 3
done

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "Running Prisma seed..."
  npm run prisma:seed
fi

exec node dist/main
