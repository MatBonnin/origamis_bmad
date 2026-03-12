#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Applying Prisma migrations..."
while true; do
  if output=$(npx prisma migrate deploy 2>&1); then
    printf '%s\n' "$output"
    break
  fi

  status=$?
  printf '%s\n' "$output"

  if printf '%s' "$output" | grep -q "P3005"; then
    echo "Existing non-empty database without Prisma migration history detected."
    echo "Skipping 'prisma migrate deploy' so the API can start."
    echo "Baseline this database before relying on automated Prisma migrations in production."
    break
  fi

  if printf '%s' "$output" | grep -Eq "P1001|Can't reach database server|Connection refused|Timed out|Server has closed the connection"; then
    echo "PostgreSQL not ready yet, retrying in 3s..."
    sleep 3
    continue
  fi

  echo "Prisma migrate deploy failed with a non-retryable error."
  exit "$status"
done

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "Running Prisma seed..."
  npm run prisma:seed
fi

exec node dist/src/main.js
