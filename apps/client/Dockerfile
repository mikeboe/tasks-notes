# Step 1: Build the application
# FROM --platform=linux/amd64 node:22-alpine AS builder
# # ARG BUILD_CONTEXT

# WORKDIR /base
# COPY . . 

# RUN npm i 
# RUN npm run build 

# # Step 2: Set up the production environment on nginx
FROM nginx:stable-alpine

# COPY --from=builder /base/dist /usr/share/nginx/html
COPY ./dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]