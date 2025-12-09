# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

# Set environment variables for the backend
ENV NODE_ENV=production
ENV PORT=3001

# Expose backend port
EXPOSE 3001

# Start the backend server
CMD ["node", "index.js"]
