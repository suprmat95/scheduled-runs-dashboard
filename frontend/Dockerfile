# Dev-oriented image for the Vite/React frontend.
FROM node:20-slim

WORKDIR /app

# Install deps first for layer caching. node_modules is built INSIDE the image
# (linux), never copied from the host (which is macOS — native binaries like
# esbuild/rollup wouldn't match). The .dockerignore keeps the host's copy out,
# and compose mounts an anonymous volume over /app/node_modules to protect it.
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host binds 0.0.0.0 so the dev server is reachable from the host.
CMD ["npm", "run", "dev", "--", "--host"]
