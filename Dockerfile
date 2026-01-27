FROM node:25-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --only=production
RUN npx prisma generate

COPY . .

EXPOSE 4001

CMD ["npm", "start"]
