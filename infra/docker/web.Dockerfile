FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @chatter/database db:generate \
  && pnpm --filter "@chatter/web..." build

FROM node:22-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo .
EXPOSE 3000
CMD ["pnpm", "--filter", "@chatter/web", "start"]
