# ---------- Base builder stage ----------
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@9.0.0

# Set working directory at the monorepo root
WORKDIR /app

# Copy only essential files first (for better layer caching)
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./

# Copy app and shared package manifests for dependency graph
COPY apps/http-backend/package.json ./apps/http-backend/
COPY packages/db-package/package.json ./packages/db-package/
COPY packages/common/package.json ./packages/common/
COPY packages/backend-common/package.json ./packages/backend-common/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Copy source files needed for workspace resolution and builds
# This must be done before pnpm install so workspace symlinks are created properly
COPY packages/typescript-config ./packages/typescript-config/
COPY packages/db-package/prisma ./packages/db-package/prisma/
COPY packages/common/src ./packages/common/src/
COPY packages/common/tsconfig.json ./packages/common/
COPY packages/backend-common/src ./packages/backend-common/src/
COPY packages/backend-common/tsconfig.json ./packages/backend-common/
COPY packages/db-package/src ./packages/db-package/src/
COPY packages/db-package/tsconfig.json ./packages/db-package/
COPY apps/http-backend/src ./apps/http-backend/src/
COPY apps/http-backend/tsconfig.json ./apps/http-backend/

# Install all dependencies (no frozen lockfile for safety in builds)
# This will create proper workspace symlinks so TypeScript can resolve @repo/typescript-config
RUN pnpm install --no-frozen-lockfile

# Create entrypoint script inline to avoid .dockerignore issues
RUN cat > /app/docker-entrypoint.sh << 'EOF'
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
EOF
RUN chmod +x /app/docker-entrypoint.sh

# Build all workspace packages that http-backend depends on
RUN pnpm --filter @repo/common run build
RUN pnpm --filter @repo/backend-common run build
RUN pnpm --filter @repo/db run build

# Build http-backend (this will use the built dependencies)
RUN pnpm --filter http-backend run build

# Generate Prisma client (postinstall should handle this, but ensure it's done)
RUN cd packages/db-package && npx prisma generate --schema=./prisma/schema.prisma

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm globally (needed for workspace resolution)
RUN npm install -g pnpm@9.0.0

# Copy workspace configuration and package manifests
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy package.json files for workspace resolution
COPY --from=builder /app/apps/http-backend/package.json ./apps/http-backend/
COPY --from=builder /app/packages/db-package/package.json ./packages/db-package/
COPY --from=builder /app/packages/common/package.json ./packages/common/
COPY --from=builder /app/packages/backend-common/package.json ./packages/backend-common/
COPY --from=builder /app/packages/typescript-config/package.json ./packages/typescript-config/

# Copy node_modules from builder (includes .pnpm store for workspace resolution)
# pnpm workspaces handle dependency resolution efficiently
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/apps/http-backend/dist ./apps/http-backend/dist

# Copy built workspace packages
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/backend-common/dist ./packages/backend-common/dist
COPY --from=builder /app/packages/db-package/dist ./packages/db-package/dist
COPY --from=builder /app/packages/db-package/generated ./packages/db-package/generated

# Copy Prisma schema and migrations for runtime migrations
COPY --from=builder /app/packages/db-package/prisma ./packages/db-package/prisma

# Copy entrypoint script from builder stage
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port (can be overridden via PORT env var)
EXPOSE 5000

# Health check (using wget or node)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const port=process.env.PORT||5000;http.get('http://localhost:'+port+'/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Use entrypoint script for optional migrations
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/http-backend/dist/index.js"]
    