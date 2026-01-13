#!/bin/bash
# ===========================================
# WAMERCE - COMPLETE AUTO DEPLOYMENT
# Single script to deploy everything
# For AlmaLinux 9
# ===========================================

set -e

DOMAIN="wamerce.com"
APP_DIR="/var/www/wamerce"
SERVER_IP=$(curl -s ifconfig.me)

echo "=========================================="
echo "  WAMERCE COMPLETE DEPLOYMENT"
echo "  Server IP: $SERVER_IP"
echo "=========================================="

# ============ STEP 1: System Setup ============
echo ""
echo "[1/8] Updating system and installing dependencies..."
dnf update -y
dnf install -y epel-release
dnf install -y curl wget git nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-devel gcc make unzip

# Node.js 18
echo "[2/8] Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs
npm install -g pm2 yarn

# MongoDB
echo "[3/8] Installing MongoDB..."
cat > /etc/yum.repos.d/mongodb-org-6.0.repo << 'MONGOREPO'
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
MONGOREPO
dnf install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Firewall & SELinux
echo "[4/8] Configuring firewall..."
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
setenforce 0 || true
sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config || true

# ============ STEP 2: Download Code ============
echo "[5/8] Setting up application..."
mkdir -p $APP_DIR
cd $APP_DIR

# Check if code exists, if not show instructions
if [ ! -d "$APP_DIR/backend" ]; then
    echo ""
    echo "=========================================="
    echo "  CODE NOT FOUND!"
    echo "=========================================="
    echo ""
    echo "Please upload your code to $APP_DIR"
    echo ""
    echo "From your local machine (Emergent), run:"
    echo ""
    echo "  scp -r /app/backend root@$SERVER_IP:/var/www/wamerce/"
    echo "  scp -r /app/storefront-standalone root@$SERVER_IP:/var/www/wamerce/"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# ============ STEP 3: Backend Setup ============
echo "[6/8] Setting up backend..."
cd $APP_DIR/backend

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create production .env
cat > .env << 'BACKENDENV'
MONGO_URL=mongodb://localhost:27017
DB_NAME=wamerce
SECRET_KEY=wamerce-super-secret-key-change-in-production
JWT_SECRET=wamerce-jwt-secret-change-in-production
BACKENDENV

deactivate

# ============ STEP 4: Frontend Setup ============
echo "[7/8] Building storefront..."
cd $APP_DIR/storefront-standalone

yarn install

cat > .env << FRONTENDENV
VITE_API_URL=https://api.$DOMAIN
VITE_DEFAULT_STORE=tnvcollection
VITE_PLATFORM_DOMAIN=$DOMAIN
FRONTENDENV

yarn build

# ============ STEP 5: Nginx Setup ============
echo "[8/8] Configuring Nginx..."

# Main site config
cat > /etc/nginx/conf.d/wamerce.conf << 'NGINXCONF'
# Wamerce API
server {
    listen 80;
    server_name api.wamerce.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }
}

# Wamerce Stores (subdomains + custom domains)
server {
    listen 80 default_server;
    server_name *.wamerce.com wamerce.com www.wamerce.com
                tnvcollection.com www.tnvcollection.com
                tnvcollection.pk www.tnvcollection.pk
                stores.wamerce.com;

    root /var/www/wamerce/storefront-standalone/dist;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # Serve React app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXCONF

# Remove default config if exists
rm -f /etc/nginx/conf.d/default.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
systemctl enable nginx

# ============ STEP 6: PM2 Setup ============
echo "Starting application with PM2..."
cd $APP_DIR

cat > ecosystem.config.js << 'PM2CONFIG'
module.exports = {
  apps: [{
    name: 'wamerce-backend',
    cwd: '/var/www/wamerce/backend',
    script: 'venv/bin/python',
    args: '-m uvicorn server:app --host 0.0.0.0 --port 8001',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
PM2CONFIG

pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "=========================================="
echo "  🎉 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Server IP: $SERVER_IP"
echo ""
echo "Your platform is now running at:"
echo "  http://$SERVER_IP (storefront)"
echo "  http://$SERVER_IP/api/health (API)"
echo ""
echo "=========================================="
echo "  NEXT: Set up DNS records"
echo "=========================================="
echo ""
echo "Add these DNS records for wamerce.com:"
echo ""
echo "  A     @       $SERVER_IP"
echo "  A     www     $SERVER_IP"
echo "  A     api     $SERVER_IP"
echo "  A     *       $SERVER_IP"
echo "  A     stores  $SERVER_IP"
echo ""
echo "For tnvcollection.com:"
echo "  A     @       $SERVER_IP"
echo "  CNAME www     stores.wamerce.com"
echo ""
echo "=========================================="
echo "  THEN: Run SSL setup"
echo "=========================================="
echo ""
echo "After DNS propagates (5-30 mins), run:"
echo "  certbot --nginx -d wamerce.com -d www.wamerce.com -d api.wamerce.com"
echo ""
echo "For wildcard SSL:"
echo "  certbot certonly --manual --preferred-challenges dns -d '*.wamerce.com'"
echo ""
