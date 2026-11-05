# syntax=docker/dockerfile:1
# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* .npmrc ./
RUN --mount=type=secret,id=npm-token,env=GITHUB_NPM_TOKEN,required=true \
    pnpm install --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM deps AS local
RUN apk add --no-cache bash ca-certificates github-cli
COPY --chown=node:node . .
ARG PORTFOLIO_CONFIG_CLI_TAG
LABEL io.portfolio.config-cli.version=$PORTFOLIO_CONFIG_CLI_TAG
RUN --mount=type=secret,id=github-token,env=GH_TOKEN,required=true \
    sh scripts/install-config-cli.sh /usr/local/bin "$PORTFOLIO_CONFIG_CLI_TAG"
RUN chown node:node /app
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "scripts/start-with-config.sh", "development"]
CMD ["node", "node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "0.0.0.0"]

FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN apk add --no-cache github-cli ca-certificates
COPY --from=configcli /portfolio-config /usr/local/bin/portfolio-config
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=github-token,env=GH_TOKEN,required=true \
    sh scripts/start-with-config.sh production pnpm build:check

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
RUN apk add --no-cache github-cli ca-certificates
COPY --from=configcli /portfolio-config /usr/local/bin/portfolio-config
COPY scripts/start-with-config.sh ./scripts/start-with-config.sh

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src/contents/resume/resume.xml ./src/contents/resume/resume.xml

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["sh", "scripts/start-with-config.sh", "production"]
CMD ["node", "server.js"]
