FROM node:14-buster
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "--enable-source-maps", "dist"]
