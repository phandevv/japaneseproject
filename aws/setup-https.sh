#!/bin/bash
# ==============================================================
# setup-https.sh — Run this ONCE on your EC2 instance to install
# NGINX + Let's Encrypt SSL for NihongoCards
#
# Usage:
#   chmod +x setup-https.sh
#   ./setup-https.sh yourdomain.com your@email.com
# ==============================================================

DOMAIN=${1:?"Usage: $0 <domain> <email>"}
EMAIL=${2:?"Usage: $0 <domain> <email>"}

echo "🔧 Installing NGINX and Certbot..."
sudo yum update -y
sudo yum install -y nginx certbot python3-certbot-nginx

echo "📝 Configuring NGINX for $DOMAIN..."
sudo tee /etc/nginx/conf.d/nihongocards.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
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

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
EOF

sudo systemctl enable nginx
sudo systemctl start nginx

echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --redirect

echo "🔄 Setting up auto-renewal cron (every 12h)..."
(crontab -l 2>/dev/null; echo "0 */12 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo "✅ HTTPS setup complete! Your site is now at https://$DOMAIN"
echo ""
echo "⚠️  IMPORTANT: Update CORS_ORIGINS in your .env file:"
echo "   CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN"
echo ""
echo "⚠️  Then restart docker-compose:"
echo "   docker-compose down && docker-compose up -d"
