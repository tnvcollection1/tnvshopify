# 🌐 DNS SETUP QUICK REFERENCE
## For Namecheap Domain Manager

---

## wamerce.com DNS Records

```
┌─────────┬──────────┬─────────────────────┬───────────┐
│  Type   │   Host   │       Value         │    TTL    │
├─────────┼──────────┼─────────────────────┼───────────┤
│    A    │    @     │   YOUR_VPS_IP       │ Automatic │
│    A    │   www    │   YOUR_VPS_IP       │ Automatic │
│    A    │   api    │   YOUR_VPS_IP       │ Automatic │
│    A    │    *     │   YOUR_VPS_IP       │ Automatic │  ← WILDCARD!
│    A    │  stores  │   YOUR_VPS_IP       │ Automatic │
└─────────┴──────────┴─────────────────────┴───────────┘
```

**The `*` wildcard enables:**
- tnvcollection.wamerce.com
- tnvcollectionpk.wamerce.com  
- anystore.wamerce.com
- [unlimited stores].wamerce.com

---

## Custom Domain: tnvcollection.com

```
┌─────────┬──────────┬─────────────────────┬───────────┐
│  Type   │   Host   │       Value         │    TTL    │
├─────────┼──────────┼─────────────────────┼───────────┤
│    A    │    @     │   YOUR_VPS_IP       │ Automatic │
│  CNAME  │   www    │ stores.wamerce.com  │ Automatic │
└─────────┴──────────┴─────────────────────┴───────────┘
```

---

## Custom Domain: tnvcollection.pk

```
┌─────────┬──────────┬─────────────────────┬───────────┐
│  Type   │   Host   │       Value         │    TTL    │
├─────────┼──────────┼─────────────────────┼───────────┤
│    A    │    @     │   YOUR_VPS_IP       │ Automatic │
│  CNAME  │   www    │ stores.wamerce.com  │ Automatic │
└─────────┴──────────┴─────────────────────┴───────────┘
```

---

## How It Works (Like Shopify!)

```
Customer visits:
  tnvcollection.com
        │
        ▼
  DNS lookup
        │
        ▼
  A record → YOUR_VPS_IP
        │
        ▼
  Nginx receives request
  (sees Host: tnvcollection.com)
        │
        ▼
  Serves storefront
        │
        ▼
  React app detects hostname
  Calls: /api/wamerce/stores/by-domain/tnvcollection.com
        │
        ▼
  Loads India store config
  Shows ₹ INR prices, Indian shipping
```

---

## For New Merchants

When merchant "newbrand.com" signs up:

**They add to their DNS:**
```
A      @     YOUR_VPS_IP
CNAME  www   stores.wamerce.com
```

**You add to Nginx:**
```bash
# Edit /etc/nginx/sites-available/wamerce-stores
# Add: newbrand.com www.newbrand.com

# Get SSL:
certbot --nginx -d newbrand.com -d www.newbrand.com

# Reload:
systemctl reload nginx
```

**Done!** Their store works at newbrand.com 🎉

---

## DNS Propagation

After adding records, wait:
- **5-15 minutes**: Usually works
- **Up to 24 hours**: Full global propagation

Check propagation:
```bash
# From your computer
nslookup tnvcollection.com
dig tnvcollection.com

# Online tool
# https://dnschecker.org
```
