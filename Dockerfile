FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Production image
FROM node:20-slim

WORKDIR /app

# Create directories for temp files and results
RUN mkdir -p /tmp /app/temp

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Set environment variables
ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "./bin/www"] 