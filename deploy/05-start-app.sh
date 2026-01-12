#!/bin/bash
# ===========================================
# WAMERCE - START APPLICATION
# ===========================================

APP_DIR="/var/www/wamerce"

echo "=========================================="
echo "  Starting Wamerce Application"
echo "=========================================="

cd $APP_DIR

# Activate Python virtual environment
source backend/venv/bin/activate

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo ""
echo "=========================================="
echo "  Application Started!"
echo "=========================================="
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs wamerce-backend"
echo ""
echo "Your platform is now live at:"
echo "  - Admin: https://wamerce.com"
echo "  - API: https://api.wamerce.com"
echo "  - Stores: https://[storename].wamerce.com"
echo ""
echo "=========================================="
