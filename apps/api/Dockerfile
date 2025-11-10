FROM docker.io/node:24-alpine

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

# RUN npm init -y
COPY package.json ./
RUN npm i --omit=dev --legacy-peer-deps

RUN addgroup --system academy && \
          adduser --system -G academy academy

COPY dist /app/
COPY /src/db/drizzle /app/src/db/drizzle
RUN chown -R academy:academy .


CMD [ "node", "src/main.js" ]
