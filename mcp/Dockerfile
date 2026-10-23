FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN pnpm build

ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "dist/resume/http/server.js"]
