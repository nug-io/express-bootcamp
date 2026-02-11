FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --prod

COPY . .

EXPOSE 4001

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm prisma generate && pnpm start"]
