#!/bin/bash
# ===========================================
# WAMERCE PLATFORM - VPS DEPLOYMENT SCRIPT
# For Namecheap VPS (Ubuntu 20.04/22.04)
# ===========================================

set -e

echo "=========================================="
echo "  WAMERCE PLATFORM DEPLOYMENT"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="wamerce.com"
APP_DIR="/var/www/wamerce"
BACKEND_PORT=8001
FRONTEND_PORT=3000

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}Step 2: Installing dependencies...${NC}"
apt install -y curl wget git nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-venv nodejs npm

# Install Node.js 18.x
echo -e "${GREEN}Step 3: Installing Node.js 18.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install MongoDB
echo -e "${GREEN}Step 4: Installing MongoDB...${NC}"
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Install PM2 for process management
echo -e "${GREEN}Step 5: Installing PM2...${NC}"
npm install -g pm2 yarn

# Create app directory
echo -e "${GREEN}Step 6: Setting up application directory...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${YELLOW}=========================================="
echo "  MANUAL STEPS REQUIRED:"
echo "==========================================${NC}"
echo ""
echo "1. Upload your code to $APP_DIR"
echo "   - backend/ folder"
echo "   - storefront-standalone/ folder"
echo ""
echo "2. Run the setup script:"
echo "   cd $APP_DIR && bash setup-app.sh"
echo ""
echo -e "${GREEN}System setup complete!${NC}"
