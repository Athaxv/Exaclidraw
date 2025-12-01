# ---------- Base builder ----------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    RUN npm install -g pnpm@9
    
    # Copy workspace metadata first (better caching)
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
    
    # Copy full monorepo
    COPY . .
    
    # Install all workspace deps
    RUN pnpm install --frozen-lockfile
    
    # Generate Prisma client BEFORE build
    RUN pnpm --filter=@repo/db run generate
    
    # Build EVERYTHING (packages + apps exactly in correct order)
    RUN pnpm turbo run build
    
    # ---------- Runtime ----------
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV PORT=5000
    
    RUN npm install -g pnpm@9
    
    # Copy root metadata for pnpm install
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
    
    # Copy only necessary built packages + app
    COPY --from=builder /app/packages ./packages
    COPY --from=builder /app/apps/http-backend ./apps/http-backend
    
    # Install ONLY production deps
    RUN pnpm install --prod --frozen-lockfile
    
    EXPOSE 5000
    CMD ["node", "apps/http-backend/dist/index.js"]
    