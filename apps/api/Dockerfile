FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps for prisma CLI)
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY index.js .

EXPOSE 4000

CMD ["node", "index.js"]
