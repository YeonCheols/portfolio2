# syntax=docker/dockerfile:1
FROM node:20-alpine
RUN apk add --no-cache ca-certificates github-cli \
    && corepack enable && corepack prepare pnpm@9 --activate

COPY --from=configcli /portfolio-config /usr/local/bin/portfolio-config

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/console/package.json ./apps/console/package.json
COPY packages/admin-contracts/package.json ./packages/admin-contracts/package.json
RUN pnpm install --frozen-lockfile

COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY fonts ./fonts
RUN pnpm build

ENV PORT=8080
EXPOSE 8080

USER node
ENTRYPOINT ["sh", "scripts/start-with-config.sh"]
CMD ["node", "apps/backend/dist/bootstrap/server.js"]
