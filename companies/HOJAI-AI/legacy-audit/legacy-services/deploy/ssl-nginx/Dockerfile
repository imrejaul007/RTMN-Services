FROM nginx:alpine

# Install Certbot
RUN apk add --no-cache certbot

# Copy configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Volume for SSL certificates
VOLUME ["/etc/letsencrypt", "/var/www/certbot"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80 443

CMD ["sh", "-c", "certbot -n renew && nginx -g 'daemon off;'"]
