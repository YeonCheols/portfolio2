# syntax=docker/dockerfile:1
FROM node:20-alpine AS workspace
RUN apk add --no-cache ca-certificates bash \
    && corepack enable && corepack prepare pnpm@9 --activate

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
COPY jest.config.cjs *.test.ts *.test.mjs Dockerfile ./
COPY .oxlintrc.json oxlint-native-evaluation.json ./
RUN pnpm build
RUN chown -R node:node /app

ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "apps/backend/dist/bootstrap/server.js"]

FROM workspace AS local
USER root
RUN apk add --no-cache github-cli
ARG PORTFOLIO_CONFIG_CLI_TAG=latest
LABEL io.portfolio.config-cli.version=$PORTFOLIO_CONFIG_CLI_TAG
RUN --mount=type=secret,id=github-token,env=GH_TOKEN,required=true \
    sh scripts/install-config-cli.sh /usr/local/bin "$PORTFOLIO_CONFIG_CLI_TAG"
USER node

FROM workspace AS runtime
USER root
RUN apk add --no-cache github-cli
COPY --from=configcli /portfolio-config /usr/local/bin/portfolio-config
USER node
ENTRYPOINT ["sh", "scripts/start-with-config.sh"]
CMD ["node", "apps/backend/dist/bootstrap/server.js"]
