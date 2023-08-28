FROM node:18

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

CMD node src/indexes.js && node src/main.js
