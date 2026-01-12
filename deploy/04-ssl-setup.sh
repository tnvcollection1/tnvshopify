#!/bin/bash
# ===========================================
# WAMERCE - SSL CERTIFICATE SETUP
# Using Let's Encrypt (Free)
# ===========================================

DOMAIN="wamerce.com"
EMAIL="admin@wamerce.com"  # Change this to your email

echo "=========================================="
echo "  Setting up SSL Certificates"
echo "=========================================="

# Install certbot if not installed
apt install -y certbot python3-certbot-nginx

# Get SSL for main domain
echo "Getting SSL for $DOMAIN..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN --non-interactive --agree-tos -m $EMAIL

# Get wildcard SSL (requires DNS challenge)
echo ""
echo "=========================================="
echo "  WILDCARD SSL CERTIFICATE"
echo "=========================================="
echo ""
echo "For wildcard SSL (*.$DOMAIN), you need DNS verification."
echo "Run this command and follow the instructions:"
echo ""
echo "  certbot certonly --manual --preferred-challenges dns -d '*.$DOMAIN' -d $DOMAIN"
echo ""
echo "You'll need to add a TXT record to your DNS."
echo ""

# Get SSL for custom domains
echo ""
echo "Getting SSL for custom domains..."

# tnvcollection.com
certbot --nginx -d tnvcollection.com -d www.tnvcollection.com --non-interactive --agree-tos -m $EMAIL || echo "tnvcollection.com SSL failed - make sure DNS is configured"

# tnvcollection.pk
certbot --nginx -d tnvcollection.pk -d www.tnvcollection.pk --non-interactive --agree-tos -m $EMAIL || echo "tnvcollection.pk SSL failed - make sure DNS is configured"

# Setup auto-renewal
echo "Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "=========================================="
echo "  SSL Setup Complete!"
echo "=========================================="
echo ""
echo "Certificates will auto-renew every 90 days."
echo ""
echo "Next: Run 'bash 05-start-app.sh' to start the application"
