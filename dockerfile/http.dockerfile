# ---------- Base builder ----------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Install pnpm
    RUN npm install -g pnpm@9
    
    # Copy everything (Render root context)
    COPY . .
    
    # Install deps (workspace-aware)
    RUN pnpm install --frozen-lockfile
    
    # Build shared packages first so their type declarations exist
    RUN pnpm --filter=@repo/common run build \
        && pnpm --filter=@repo/backend-common run build \
        && pnpm --filter=@repo/db run build

    # Build only http-backend and its dependency graph
    RUN pnpm turbo run build --filter=http-backend...
    
    # Generate Prisma client after build
    RUN pnpm --filter=@repo/db run generate
    
    # ---------- Runtime ----------
        FROM node:20-alpine AS runner
        WORKDIR /app
        
        ENV NODE_ENV=production
        ENV PORT=5000
        
        # Install pnpm to install runtime-only deps
        RUN npm install -g pnpm@9
        
        # Copy workspace metadata needed for pnpm install
        COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
        COPY apps/http-backend/package.json ./apps/http-backend/
        COPY packages ./packages
        
        # Install ONLY production dependencies for the backend
        RUN pnpm install --prod --filter=http-backend...
        
        # Copy built app
        COPY --from=builder /app/apps/http-backend/dist ./apps/http-backend/dist
        
        EXPOSE 5000
        
        CMD ["node", "apps/http-backend/dist/index.js"]
        
    