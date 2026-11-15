# CYBER-CRYPT — production image for VPS (Oracle Always Free, etc.)
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --omit=dev && npm cache clean --force

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Keep Neon DATABASE_URL / CLOUD_SAVE_SECRET in the host env (never bake secrets in)
CMD ["npx", "tsx", "server.ts"]
