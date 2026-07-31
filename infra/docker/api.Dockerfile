FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @chatter/database db:generate \
  && pnpm --filter "@chatter/api..." build

FROM node:22-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo .
EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @chatter/database db:migrate && pnpm --filter @chatter/database db:seed && node apps/api/dist/main.js"]
