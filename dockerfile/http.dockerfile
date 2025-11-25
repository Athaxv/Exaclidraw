# ---------- Base builder ----------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Install pnpm
    RUN npm install -g pnpm@9
    
    # Copy everything (Render root context)
    COPY . .
    
    # Install deps (workspace-aware)
    RUN pnpm install --frozen-lockfile
    
    # Build only http-backend and its dependency graph
    RUN pnpm turbo run build --filter=apps/http-backend...
    
    # Generate Prisma client after build
    RUN pnpm --filter=@repo/db run generate
    
    # ---------- Runtime ----------
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV PORT=5000
    
    # Copy only what we need to run the backend
    COPY --from=builder /app/apps/http-backend/dist ./apps/http-backend/dist
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/packages ./packages
    COPY --from=builder /app/package.json ./
    
    EXPOSE 5000
    
    CMD ["node", "apps/http-backend/dist/index.js"]
    