#!/bin/bash
# ==============================================================
# setup-https.sh — Run this ONCE on your EC2 instance to install
# NGINX + Let's Encrypt SSL for NihongoCards
#
# Usage:
#   chmod +x setup-https.sh
#   ./setup-https.sh phandeptrai.id.vn your@email.com
# ==============================================================

DOMAIN=${1:?"Usage: $0 <domain> <email>"}
EMAIL=${2:?"Usage: $0 <domain> <email>"}

echo "🔧 Installing NGINX and Certbot..."
sudo yum update -y
sudo yum install -y nginx certbot python3-certbot-nginx

echo "📝 Writing NGINX config for $DOMAIN (HTTP only first)..."
sudo tee /etc/nginx/conf.d/nihongocards.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge — must be reachable before certbot runs
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
    }
}
EOF

# Remove default nginx site to avoid port conflict
sudo rm -f /etc/nginx/conf.d/default.conf

# Docker's frontend is bound to port 80 — nginx host needs a different port
# We'll move docker frontend to port 3000 and have nginx serve port 80/443
echo "🔄 Updating docker-compose to use port 3000 for frontend..."
cd /home/ec2-user/app
if [ -f docker-compose.yml ]; then
    sed -i 's/"80:80"/"3000:80"/g' docker-compose.yml
    docker-compose up -d frontend
fi

# Update nginx config to use port 3000 for frontend proxy
sudo sed -i 's|proxy_pass http://localhost:80;|proxy_pass http://localhost:3000;|g' /etc/nginx/conf.d/nihongocards.conf

sudo mkdir -p /var/www/certbot
sudo systemctl enable nginx
sudo systemctl start nginx

echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --redirect

echo "🔄 Reloading NGINX with SSL config..."
sudo systemctl reload nginx

echo "🔄 Setting up auto-renewal cron (twice daily)..."
(crontab -l 2>/dev/null; echo "0 */12 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

# Update CORS in docker .env
cd /home/ec2-user/app
sed -i '/^CORS_ORIGINS=/d' .env
echo "CORS_ORIGINS=https://$DOMAIN" >> .env
docker-compose up -d backend

echo ""
echo "✅ HTTPS setup complete!"
echo "   → https://$DOMAIN"
echo ""
echo "📋 Summary of changes:"
echo "   - nginx installed on host (port 80/443)"
echo "   - Docker frontend moved to port 3000 (internal)"
echo "   - SSL cert from Let's Encrypt for $DOMAIN"
echo "   - Auto-renewal every 12h via cron"
echo "   - CORS_ORIGINS updated to https://$DOMAIN"
