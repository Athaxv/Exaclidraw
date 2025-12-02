    # ---------- Base builder ----------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    ENV TURBO_FORCE=1
    
    # Install pnpm
    RUN npm install -g pnpm@9
    
    # Copy workspace metadata for better caching
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
    
    # Copy full monorepo
    COPY . .
    
    # Install ALL workspace dependencies
    RUN pnpm install --frozen-lockfile
    
    # Generate Prisma client for db-package (only if ws-backend uses it)
    RUN pnpm --filter=@repo/db run generate
    
    # Build all shared packages (db, backend-common, common)
    RUN pnpm --filter=@repo/db run build
    RUN pnpm --filter=@repo/backend-common run build
    RUN pnpm --filter=@repo/common run build
    
    # Build ONLY ws-backend
    RUN pnpm --filter=ws-backend... run build
    
    # ---------- Runtime Image ----------
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV PORT=8080
    
    RUN npm install -g pnpm@9
    
    # Copy workspace metadata (required for pnpm install)
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
    
    # Copy built packages + ws-backend
    COPY --from=builder /app/packages ./packages
    COPY --from=builder /app/apps/ws-backend ./apps/ws-backend
    
    # Install only production dependencies for ws backend
    RUN pnpm install --prod --filter=ws-backend... --frozen-lockfile
    
    EXPOSE 8000
   
    CMD ["node", "apps/ws-backend/dist/index.js"]
    