# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup Server
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production

# Copy Server Code
COPY server/ ./

# Copy Frontend Build to Server Public Dir
COPY --from=frontend-builder /app/client/dist ./public

# Configuration
ENV PORT=3000
ENV ROOT_PATH=/data
EXPOSE 3000

# Create volume mount point
RUN mkdir -p /data

CMD ["node", "index.js"]
