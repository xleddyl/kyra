FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
RUN apk add --no-cache postgresql-client

# Root dependencies
FROM base AS root-deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Server build stage
FROM base AS server-builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY src/server/package.json ./src/server/
RUN yarn install --frozen-lockfile
COPY src/server/ ./src/server/

# Web build stage
FROM base AS web-builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY src/web/package.json ./src/web/
RUN yarn install --frozen-lockfile
COPY src/web/ ./src/web/
RUN cd src/web && yarn build

# CLI build stage
FROM base AS cli-builder
WORKDIR /app
COPY src/cli/package.json ./src/cli/
COPY src/cli/tsconfig.json ./src/cli/
RUN cd src/cli && yarn install --frozen-lockfile
COPY src/cli/ ./src/cli/
RUN cd src/cli && yarn build

# Kyra Backend - Production ready image for external use
FROM base AS kyra-backend
WORKDIR /app

# Install Python and dependencies for migra
RUN apk add --no-cache python3 py3-pip py3-setuptools py3-wheel
RUN pip3 install --break-system-packages migra[pg]

# Install production dependencies
COPY package.json yarn.lock ./
COPY src/server/package.json ./src/server/
RUN yarn install --production --frozen-lockfile

# Install global tools for type generation
RUN yarn global add graphql postgraphile @graphile-contrib/pg-simplify-inflector @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations

# Copy built server
COPY --from=server-builder /app/src/server ./src/server/

# Copy built CLI
COPY --from=cli-builder /app/src/cli/dist ./src/cli/
COPY --from=cli-builder /app/src/cli/package.json ./src/cli/
RUN cd src/cli && yarn install --production --frozen-lockfile

# Make kyra CLI globally available
RUN ln -s /app/src/cli/index.js /usr/local/bin/kyra && chmod +x /app/src/cli/index.js

# Copy root package.json scripts
COPY package.json ./

# Create kyra directory for external schema/migrations/seeds
RUN mkdir -p /app/kyra/schema /app/kyra/migrations /app/kyra/seeds

# Create initialization script
COPY <<EOF /app/init-kyra
#!/bin/sh
set -e

echo "🔄 Initializing Kyra Backend..."

# Wait for database to be ready
until pg_isready -h \${DB_HOST:-postgres} -p \${DB_PORT:-5432} -U \${DB_USER:-postgres}; do
  echo "⏳ Waiting for database..."
  sleep 2
done

echo "✅ Database is ready"

# Note: Schema, migrations, and seeds are now handled by the CLI reset command
# The mounted directories are available for the CLI to use at:
# - /app/kyra/schema
# - /app/kyra/migrations
# - /app/kyra/seeds

echo "🚀 Starting Kyra Backend..."
exec "\$@"
EOF

RUN chmod +x /app/init-kyra

EXPOSE 4000

# Use init script as entrypoint
ENTRYPOINT ["/app/init-kyra"]
CMD ["yarn", "workspace", "@kyra/server", "start"]

# Server production (legacy target for existing docker-compose)
FROM base AS server
WORKDIR /app
COPY package.json yarn.lock ./
COPY src/server/package.json ./src/server/
RUN yarn install --production --frozen-lockfile
COPY --from=server-builder /app/src/server ./src/server/
EXPOSE 4000
CMD ["yarn", "workspace", "@kyra/server", "start"]

# Web production
FROM base AS web
WORKDIR /app
COPY package.json yarn.lock ./
COPY src/web/package.json ./src/web/
RUN yarn install --production --frozen-lockfile
COPY --from=web-builder /app/src/web/.output ./src/web/.output
EXPOSE 3000
CMD ["node", "./src/web/.output/server/index.mjs"]

# Combined production - Single container with both backend and web
FROM base AS combined
WORKDIR /app

# Install Python and dependencies for migra
RUN apk add --no-cache python3 py3-pip py3-setuptools py3-wheel
RUN pip3 install --break-system-packages migra[pg]

# Install PM2 globally for process management
RUN yarn global add pm2

# Install production dependencies
COPY package.json yarn.lock ./
COPY src/server/package.json ./src/server/
COPY src/web/package.json ./src/web/
RUN yarn install --production --frozen-lockfile

# Install global tools for type generation
RUN yarn global add graphql postgraphile @graphile-contrib/pg-simplify-inflector @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations

# Copy built server
COPY --from=server-builder /app/src/server ./src/server/

# Copy built web
COPY --from=web-builder /app/src/web/.output ./src/web/.output

# Copy built CLI
COPY --from=cli-builder /app/src/cli/dist ./src/cli/
COPY --from=cli-builder /app/src/cli/package.json ./src/cli/
RUN cd src/cli && yarn install --production --frozen-lockfile

# Make kyra CLI globally available
RUN ln -s /app/src/cli/index.js /usr/local/bin/kyra && chmod +x /app/src/cli/index.js

# Create kyra directory for external schema/migrations/seeds
RUN mkdir -p /app/kyra/schema /app/kyra/migrations /app/kyra/seeds

# Create PM2 ecosystem config
COPY <<EOF /app/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'kyra-backend',
      cwd: '/app',
      script: 'yarn',
      args: 'workspace @kyra/server start',
      env: {
        PORT: 4000
      }
    },
    {
      name: 'kyra-web',
      cwd: '/app',
      script: 'node',
      args: './src/web/.output/server/index.mjs',
      env: {
        PORT: 3000
      }
    }
  ]
};
EOF

# Create initialization script
COPY <<EOF /app/init-combined
#!/bin/sh
set -e

echo "🔄 Initializing Kyra Combined..."

# Set Nuxt environment variables from DATABASE_URL
export NUXT_DATABASE_URL=\$DATABASE_URL
export NUXT_PUBLIC_DATABASE_URL=\$DATABASE_URL

# Wait for database to be ready
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "⏳ Waiting for database..."
  sleep 2
done

echo "✅ Database is ready"
echo "🚀 Starting Kyra Backend and Web with PM2..."

# Start both services with PM2
exec pm2-runtime start /app/ecosystem.config.cjs
EOF

RUN chmod +x /app/init-combined

EXPOSE 3000 4000

# Use kyra serve command as entrypoint
ENTRYPOINT ["kyra", "serve"]
