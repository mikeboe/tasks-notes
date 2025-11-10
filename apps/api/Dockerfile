FROM docker.io/node:24-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN npm init -y
RUN npm i argon2

RUN addgroup --system academy && \
          adduser --system -G academy academy

COPY dist /app/
COPY /src/db/drizzle /app/src/db/drizzle
RUN chown -R academy:academy .


CMD [ "node", "main.js" ]
