# Use Node.js LTS as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json files for both client and server
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN cd server && npm install --production
RUN cd client && npm install

# Copy the rest of the application
COPY . .

# Build the client
RUN cd client && npm run build

# Expose the port the server runs on
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the server
CMD ["node", "server/src/index.js"]
