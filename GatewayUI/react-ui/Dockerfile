# Build React App
FROM node:18 AS build
WORKDIR /app

# Define build argument (default: development)
ARG NODE_ENV=preproduction
ENV NODE_ENV=${NODE_ENV}

# Debugging - Print the environment being used
RUN echo "Building frontend with NODE_ENV=${NODE_ENV}"

# Copy package.json and package-lock.json to leverage Docker caching
COPY package*.json ./
RUN npm install --frozen-lockfile --legacy-peer-deps

# Copy the rest of the application and build
COPY . .

# Debugging - Check that environments folder exists
RUN ls -l src/app/environments/

# Ensure React picks the correct environment file before building
RUN if [ "$NODE_ENV" = "production" ]; then \
        echo "Using production environment"; \
        cp src/app/environments/environment.production.ts src/app/environments/environment.ts; \
    else \
        echo "Using preproduction environment"; \
        cp src/app/environments/environment.preproduction.ts src/app/environments/environment.ts; \
    fi

# Run build process
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy build output from previous stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]