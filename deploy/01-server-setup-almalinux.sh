#!/bin/bash
# ===========================================
# WAMERCE PLATFORM - VPS DEPLOYMENT SCRIPT
# For AlmaLinux 9 (Namecheap VPS)
# ===========================================

set -e

echo "=========================================="
echo "  WAMERCE PLATFORM DEPLOYMENT"
echo "  AlmaLinux 9 Server Setup"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Updating system...${NC}"
dnf update -y

echo -e "${GREEN}Step 2: Installing EPEL repository...${NC}"
dnf install -y epel-release

echo -e "${GREEN}Step 3: Installing dependencies...${NC}"
dnf install -y curl wget git nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-devel gcc make

# Install Node.js 18.x
echo -e "${GREEN}Step 4: Installing Node.js 18.x...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
dnf install -y nodejs

# Install MongoDB 6.0
echo -e "${GREEN}Step 5: Installing MongoDB 6.0...${NC}"
cat > /etc/yum.repos.d/mongodb-org-6.0.repo << 'EOF'
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

dnf install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Install PM2 and Yarn
echo -e "${GREEN}Step 6: Installing PM2 and Yarn...${NC}"
npm install -g pm2 yarn

# Create app directory
echo -e "${GREEN}Step 7: Creating application directory...${NC}"
mkdir -p /var/www/wamerce

# Configure firewall
echo -e "${GREEN}Step 8: Configuring firewall...${NC}"
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=8001/tcp
firewall-cmd --reload

# Disable SELinux (or set to permissive for easier setup)
echo -e "${GREEN}Step 9: Configuring SELinux...${NC}"
setenforce 0
sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

echo ""
echo -e "${GREEN}=========================================="
echo "  Server Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Server IP: $(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/www/wamerce"
echo "2. Run: bash 02-app-setup.sh"
echo ""
