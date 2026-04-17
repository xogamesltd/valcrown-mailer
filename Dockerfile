FROM node:20-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY package.json .
RUN npm install --production --no-audit --no-fund
COPY . .
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
