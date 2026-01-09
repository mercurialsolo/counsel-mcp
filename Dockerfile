# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

EXPOSE 8080

COPY --from=builder /app/dist ./dist

# Standard entrypoint for stdio mode
ENTRYPOINT ["node", "dist/index.js", "start"]
