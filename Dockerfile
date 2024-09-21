FROM node:20-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm install -g typescript && tsc

# Create directories for data and screenshots
RUN mkdir -p energy_data screenshots

# Start the app
CMD ["node", "dist/index.js"]
