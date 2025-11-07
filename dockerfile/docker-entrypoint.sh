#!/bin/sh
set -e

# Optional: Run Prisma migrations if RUN_MIGRATIONS environment variable is set
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$RUN_MIGRATIONS" = "1" ]; then
  echo "Running Prisma migrations..."
  cd packages/db-package
  pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma || npx prisma migrate deploy --schema=./prisma/schema.prisma
  cd ../..
  echo "Migrations completed."
fi

# Execute the main command
exec "$@"

