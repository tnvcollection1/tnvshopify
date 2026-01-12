#!/bin/bash
# ===========================================
# WAMERCE - NGINX CONFIGURATION
# Shopify-like routing with custom domains
# ===========================================

DOMAIN="wamerce.com"
APP_DIR="/var/www/wamerce"
SERVER_IP=$(curl -s ifconfig.me)

echo "=========================================="
echo "  Configuring Nginx for Wamerce"
echo "  Server IP: $SERVER_IP"
echo "=========================================="

# Main Nginx config for wamerce.com (Admin + API)
cat > /etc/nginx/sites-available/wamerce-main << EOF
# Wamerce Main - Admin Panel & API
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN;

    # API Routes
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }

    # Admin Panel (if you have one)
    location / {
        root $APP_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Storefront config - handles ALL store subdomains and custom domains
cat > /etc/nginx/sites-available/wamerce-stores << EOF
# Wamerce Stores - Subdomains & Custom Domains
# This handles: *.wamerce.com AND merchant custom domains

server {
    listen 80;
    
    # Wildcard for all subdomains
    server_name *.$DOMAIN;
    
    # Storefront static files
    root $APP_DIR/storefront-standalone/dist;
    index index.html;

    # API proxy for storefront
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }

    # Serve storefront for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Custom Domain Handler - Add merchant domains here
# Example: tnvcollection.com, tnvcollection.pk
server {
    listen 80;
    
    # Add custom merchant domains here
    server_name tnvcollection.com www.tnvcollection.com 
                tnvcollection.pk www.tnvcollection.pk
                stores.$DOMAIN;  # CNAME target for merchants

    root $APP_DIR/storefront-standalone/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50M;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable sites
ln -sf /etc/nginx/sites-available/wamerce-main /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/wamerce-stores /etc/nginx/sites-enabled/

# Remove default
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Reload nginx
systemctl reload nginx

echo ""
echo "=========================================="
echo "  Nginx configured!"
echo "=========================================="
echo ""
echo "Your server IP: $SERVER_IP"
echo ""
echo "DNS RECORDS TO ADD:"
echo "===================="
echo ""
echo "For wamerce.com:"
echo "  A     @      $SERVER_IP"
echo "  A     www    $SERVER_IP"
echo "  A     api    $SERVER_IP"
echo "  A     *      $SERVER_IP   (wildcard for subdomains)"
echo ""
echo "For tnvcollection.com:"
echo "  A     @      $SERVER_IP"
echo "  CNAME www    stores.$DOMAIN"
echo ""
echo "For tnvcollection.pk:"
echo "  A     @      $SERVER_IP"
echo "  CNAME www    stores.$DOMAIN"
echo ""
echo "=========================================="
echo ""
echo "Next: Run 'bash 04-ssl-setup.sh' for HTTPS"
