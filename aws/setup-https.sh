#!/bin/bash
set -e

DOMAIN="phandeptrai.id.vn"
EMAIL="vanphan190704@gmail.com"
APP_DIR="/home/ec2-user/app"

echo "Step 1: Move Docker frontend from port 80 to 3000 first"
cd "$APP_DIR"
sed -i 's|- "80:80"|- "3000:80"|g' docker-compose.yml
sed -i "s/- '80:80'/- '3000:80'/g" docker-compose.yml
grep "3000" docker-compose.yml && echo "Port changed OK" || echo "WARNING: check docker-compose.yml manually"
docker-compose up -d frontend
echo "Waiting for frontend container to release port 80..."
sleep 5

echo "Step 2: Configure nginx"
rm -f /etc/nginx/conf.d/default.conf
cat > /etc/nginx/conf.d/nihongocards.conf << 'NGINXEOF'
server {
    listen 80;
    server_name phandeptrai.id.vn www.phandeptrai.id.vn;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

mkdir -p /var/www/certbot
systemctl enable nginx
systemctl restart nginx
echo "nginx started OK"

echo "Step 3: Test nginx config"
nginx -t && echo "nginx config OK"

echo "Step 4: Run Certbot"
certbot --nginx \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --redirect
echo "certbot done"

echo "Step 5: Setup auto-renewal cron"
(crontab -l 2>/dev/null; echo "0 */12 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
echo "cron set"

echo "Step 6: Update CORS in .env"
sed -i '/^CORS_ORIGINS=/d' "$APP_DIR/.env"
echo "CORS_ORIGINS=https://$DOMAIN" >> "$APP_DIR/.env"
docker-compose --env-file "$APP_DIR/.env" up -d backend
echo "backend restarted with new CORS"

echo "DONE: HTTPS is now active at https://$DOMAIN"
