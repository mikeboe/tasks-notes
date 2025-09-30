# Use a lightweight Nginx server
FROM nginx:1.25-alpine

# Remove the default Nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy the pre-built artifacts from the build context (the 'dist' folder)
# The GitHub Actions workflow will place the 'dist' folder here before building.
COPY dist/ /usr/share/nginx/html

# Expose port 80 and start Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]