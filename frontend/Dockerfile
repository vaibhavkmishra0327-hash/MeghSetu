FROM node:20-alpine AS build
WORKDIR /ui
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM node:20-alpine
WORKDIR /ui
COPY --from=build /ui ./
EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0"]
