# TLS Certificates

This directory stores TLS certificates for secure federation communication.

## Development (self-signed)

On first run, `scripts/init.sh` generates self-signed certificates:
- `nexus.crt` — Self-signed X.509 certificate
- `nexus.key` — RSA 2048 private key

**These are for local development only.** Browsers and federation nodes will show security warnings.

## Production

Replace with real certificates from a trusted CA (Let's Encrypt, DigiCert, etc.):

1. Obtain your certificate (e.g., from your DNS provider or certbot):
   ```
   nexus.crt   — Your TLS certificate
   nexus.key   — Your private key
   ```

2. Or use Let's Encrypt:
   ```bash
   certbot certonly --nginx -d nexha.yourcompany.com
   cp /etc/letsencrypt/live/nexha.yourcompany.com/fullchain.pem nexus.crt
   cp /etc/letsencrypt/live/nexha.yourcompany.com/privkey.pem nexus.key
   ```

3. Update `.env`:
   ```bash
   TLS_ENABLED=true
   TLS_CERT_PATH=/certs/nexus.crt
   TLS_KEY_PATH=/certs/nexus.key
   ```

4. Restart:
   ```bash
   docker compose restart
   ```

## Certificate Permissions

```bash
chmod 600 certs/nexus.key   # Private key: owner read/write only
chmod 644 certs/nexus.crt   # Certificate: world readable
```

## Certificate Renewal (Let's Encrypt)

```bash
certbot renew
docker compose restart
```
