FROM node:20-slim

# Install Chromium and ALL required dependencies for headless browser
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    dbus \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip its Chromium download — use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start dbus to avoid dbus errors with Chromium
RUN mkdir -p /var/run/dbus

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create directory for WhatsApp session persistence
RUN mkdir -p /app/.wwebjs_auth && chmod -R 777 /app/.wwebjs_auth

# Chromium multi-process needs more shared memory than Docker's default 64MB
# Mount tmpfs at /dev/shm with 1GB
RUN mkdir -p /dev/shm && mount -t tmpfs -o size=1g tmpfs /dev/shm 2>/dev/null || true

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["node", "index.js"]
