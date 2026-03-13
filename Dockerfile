FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install --loglevel verbose
RUN npx prisma generate

COPY . .

RUN npx prisma generate

EXPOSE 3000
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy || true && node server.js", "server.js"]
