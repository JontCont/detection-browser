# Stage 1: Build Angular app
FROM node:18 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with http-server
FROM node:18-alpine AS runtime

WORKDIR /app
RUN npm install -g http-server
COPY --from=build /app/dist/detection /app/dist
EXPOSE 8080
CMD ["http-server", "dist", "-p", "8080"]