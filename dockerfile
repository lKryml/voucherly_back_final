# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /src

# 1. Copy package files first
COPY package*.json ./
COPY tsconfig.json ./

# 2. Install dependencies
RUN npm ci

# 3. Copy source files AND .env
COPY src/ ./src/
COPY .env . 

# 4. Build project
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /src
ENV NODE_ENV=production

# Copy from builder
COPY --from=builder /src/package*.json ./
COPY --from=builder /src/dist ./dist
COPY --from=builder /src/.env .  

# Install production deps
RUN npm ci --production

EXPOSE 3000
CMD ["node", "dist/index.js"]