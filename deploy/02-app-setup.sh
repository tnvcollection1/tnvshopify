#!/bin/bash
# ===========================================
# WAMERCE - APPLICATION SETUP SCRIPT
# Run after uploading code to server
# ===========================================

set -e

APP_DIR="/var/www/wamerce"
DOMAIN="wamerce.com"

cd $APP_DIR

echo "=========================================="
echo "  Setting up Wamerce Application"
echo "=========================================="

# Backend Setup
echo "Setting up Backend..."
cd $APP_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=wamerce
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET=your-jwt-secret-change-this
EOF

echo "Backend setup complete!"

# Frontend/Storefront Setup
echo "Setting up Storefront..."
cd $APP_DIR/storefront-standalone

# Install dependencies
yarn install

# Create production .env
cat > .env << EOF
VITE_API_URL=https://api.$DOMAIN
VITE_DEFAULT_STORE=tnvcollection
VITE_PLATFORM_DOMAIN=$DOMAIN
EOF

# Build for production
yarn build

echo "Storefront build complete!"

# PM2 Ecosystem
echo "Creating PM2 ecosystem..."
cd $APP_DIR

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'wamerce-backend',
      cwd: '/var/www/wamerce/backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    }
  ]
};
EOF

echo "PM2 ecosystem created!"
echo ""
echo "Next: Run 'bash 03-nginx-setup.sh' to configure Nginx"
