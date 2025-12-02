# ---------- Base builder ----------
    FROM node:20-alpine AS builder
    WORKDIR /app
    ENV TURBO_FORCE=1
    
    RUN npm install -g pnpm@9
    
    # Copy workspace metadata first
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
    
    # Copy full monorepo
    COPY . .
    
    # Install all workspace deps
    RUN pnpm install --frozen-lockfile
    
    # Generate Prisma client BEFORE build
    RUN pnpm --filter=@repo/db run generate
    
    # Build ALL packages + apps
    RUN pnpm turbo run build
    
    # ---------- Runtime ----------
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV PORT=5000
    
    RUN npm install -g pnpm@9
    
    # Copy full built output
    COPY --from=builder /app ./
    
    # Install only production deps
    RUN pnpm install --prod --frozen-lockfile
    
    EXPOSE 5000
    CMD ["node", "apps/http-backend/dist/index.js"]
    