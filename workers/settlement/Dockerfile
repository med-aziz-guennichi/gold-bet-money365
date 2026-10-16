FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY worker.mjs ./worker.mjs
USER node
CMD ["node", "worker.mjs"]
