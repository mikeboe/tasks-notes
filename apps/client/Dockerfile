# Use a lightweight Nginx server
FROM nginx:1.25-alpine

WORKDIR /app

# Remove the default Nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy the pre-built artifacts from the build context (the 'dist' folder)
# The GitHub Actions workflow will place the 'dist' folder here before building.
COPY dist/ /usr/share/nginx/html

COPY nginx/start.sh /app/
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY .env.example /app/
EXPOSE 80
ENTRYPOINT ["sh","/app/start.sh"]