FROM docker.io/node:22-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN npm init -y
RUN npm i argon2

RUN addgroup --system academy && \
          adduser --system -G academy academy

COPY dist /app/
RUN chown -R academy:academy .


CMD [ "node", "main.js" ]
