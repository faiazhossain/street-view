# Stage 1: Install dependencies
FROM --platform=linux/amd64 node:18-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

ENV SKIP_HUSKY=1

RUN npm ci

# Stage 2: Rebuilds the source code, sets environment variables, and runs the production build
FROM --platform=linux/amd64 node:18-alpine AS builder

WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules

ENV NEXT_PUBLIC_API_URL=NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM --platform=linux/amd64 node:18-alpine AS runner

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Copy only necessary files
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/entrypoint.sh .
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set up permissions and user
RUN chmod +x /app/entrypoint.sh \
    && addgroup -S nodejs -g 1001 \
    && adduser -S nextjs -u 1001 \
    && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]