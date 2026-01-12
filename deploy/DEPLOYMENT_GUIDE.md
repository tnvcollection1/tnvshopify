# 🚀 WAMERCE PLATFORM - VPS DEPLOYMENT GUIDE
## Deploy on Namecheap VPS (Shopify-like Setup)

---

## 📋 Pre-requisites

1. **Namecheap VPS** - Pulsar plan (2GB RAM) recommended
2. **Domain**: wamerce.com configured in Namecheap
3. **SSH Access** to your VPS

---

## 🖥️ STEP 1: Order VPS & Initial Access

### 1.1 Order Namecheap VPS
- Go to Namecheap → Hosting → VPS Hosting
- Select **Pulsar** (Rs 620/mo)
- Choose **Ubuntu 22.04** as OS
- Complete purchase

### 1.2 Get VPS Credentials
After purchase, you'll receive:
- **IP Address**: e.g., `192.168.1.100`
- **Root Password**: (in email)

### 1.3 Connect via SSH
```bash
ssh root@YOUR_VPS_IP
```

---

## 🔧 STEP 2: Server Setup

### 2.1 Upload deployment scripts
From your local machine:
```bash
scp -r /app/deploy root@YOUR_VPS_IP:/root/
```

### 2.2 Run server setup
```bash
ssh root@YOUR_VPS_IP
cd /root/deploy
chmod +x *.sh
bash 01-server-setup.sh
```

This installs:
- Node.js 18.x
- Python 3 + pip
- MongoDB 6.0
- Nginx
- PM2
- Certbot (for SSL)

---

## 📦 STEP 3: Upload Application Code

### 3.1 Export code from Emergent
- Click "Save to GitHub" in Emergent
- Or download as ZIP

### 3.2 Upload to VPS
```bash
# Create directory
ssh root@YOUR_VPS_IP "mkdir -p /var/www/wamerce"

# Upload backend
scp -r /app/backend root@YOUR_VPS_IP:/var/www/wamerce/

# Upload storefront
scp -r /app/storefront-standalone root@YOUR_VPS_IP:/var/www/wamerce/

# Upload deploy scripts
scp -r /app/deploy root@YOUR_VPS_IP:/var/www/wamerce/
```

### 3.3 Setup application
```bash
ssh root@YOUR_VPS_IP
cd /var/www/wamerce/deploy
bash 02-app-setup.sh
```

---

## 🌐 STEP 4: DNS Configuration

### 4.1 Get your VPS IP
```bash
curl ifconfig.me
```
Note this IP (e.g., `192.168.1.100`)

### 4.2 Configure wamerce.com DNS (Namecheap)

Go to: **Namecheap → Domain List → wamerce.com → Advanced DNS**

Add these records:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | Automatic |
| A | www | YOUR_VPS_IP | Automatic |
| A | api | YOUR_VPS_IP | Automatic |
| A | * | YOUR_VPS_IP | Automatic |
| A | stores | YOUR_VPS_IP | Automatic |

**Important**: The `*` wildcard record enables `*.wamerce.com` subdomains!

### 4.3 Configure tnvcollection.com DNS

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | Automatic |
| CNAME | www | stores.wamerce.com | Automatic |

### 4.4 Configure tnvcollection.pk DNS

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | Automatic |
| CNAME | www | stores.wamerce.com | Automatic |

---

## 🔒 STEP 5: Nginx & SSL Setup

### 5.1 Configure Nginx
```bash
cd /var/www/wamerce/deploy
bash 03-nginx-setup.sh
```

### 5.2 Get SSL Certificates
```bash
bash 04-ssl-setup.sh
```

For wildcard SSL (*.wamerce.com):
```bash
certbot certonly --manual --preferred-challenges dns -d '*.wamerce.com' -d wamerce.com
```
Follow the instructions to add TXT record to DNS.

---

## 🚀 STEP 6: Start Application

```bash
cd /var/www/wamerce/deploy
bash 05-start-app.sh
```

### Verify everything is running:
```bash
pm2 status
pm2 logs wamerce-backend
```

---

## ✅ STEP 7: Test Your Platform

| URL | What it shows |
|-----|---------------|
| https://wamerce.com | Admin Panel |
| https://api.wamerce.com/api/health | API Health Check |
| https://tnvcollection.wamerce.com | India Store |
| https://tnvcollectionpk.wamerce.com | Pakistan Store |
| https://tnvcollection.com | India Store (custom domain) |
| https://tnvcollection.pk | Pakistan Store (custom domain) |

---

## 🏪 MERCHANT CUSTOM DOMAIN SETUP

When a new merchant wants to connect their domain (e.g., `newstore.com`):

### Merchant DNS Setup:
```
A     @    YOUR_VPS_IP
CNAME www  stores.wamerce.com
```

### Add to Nginx (on your server):
```bash
nano /etc/nginx/sites-available/wamerce-stores
```

Add the domain to the `server_name` line:
```nginx
server_name tnvcollection.com www.tnvcollection.com 
            tnvcollection.pk www.tnvcollection.pk
            newstore.com www.newstore.com  # ADD NEW DOMAIN HERE
            stores.wamerce.com;
```

### Get SSL for new domain:
```bash
certbot --nginx -d newstore.com -d www.newstore.com
```

### Reload Nginx:
```bash
nginx -t && systemctl reload nginx
```

---

## 📊 Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs wamerce-backend

# Restart app
pm2 restart wamerce-backend

# Check Nginx status
systemctl status nginx

# Check MongoDB status
systemctl status mongod

# Renew SSL certificates
certbot renew
```

---

## 🔧 Troubleshooting

### App not starting?
```bash
cd /var/www/wamerce/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
# Check for errors
```

### Nginx error?
```bash
nginx -t  # Test config
cat /var/log/nginx/error.log  # View errors
```

### MongoDB not running?
```bash
systemctl start mongod
systemctl status mongod
```

---

## 🎉 Congratulations!

Your Wamerce platform is now live with:

✅ **Admin Panel**: https://wamerce.com  
✅ **API**: https://api.wamerce.com  
✅ **Store Subdomains**: https://[store].wamerce.com  
✅ **Custom Domains**: merchants can CNAME to stores.wamerce.com  
✅ **Free SSL**: Auto-renewed every 90 days  

Just like Shopify! 🚀
