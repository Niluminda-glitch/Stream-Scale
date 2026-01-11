# Use Node.js as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Default command (can be overridden)
CMD ["npm", "start"]