# syntax=docker/dockerfile:1
FROM node:20-alpine
RUN apk add --no-cache ca-certificates github-cli \
    && corepack enable && corepack prepare pnpm@9 --activate

COPY --from=configcli /portfolio-config /usr/local/bin/portfolio-config

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./tsconfig.json
COPY tailwind.config.js ./tailwind.config.js
COPY src ./src
COPY app ./app
COPY scripts ./scripts
COPY fonts ./fonts
RUN pnpm build

ENV PORT=8080
EXPOSE 8080

USER node
ENTRYPOINT ["sh", "scripts/start-with-config.sh"]
CMD ["node", "dist/resume/http/server.js"]
