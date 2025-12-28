---
description: How to deploy the PrimeTalker React app on AWS EC2
---

# 🚀 Deploying PrimeTalker on AWS EC2

## Prerequisites
- AWS Account
- A domain name (optional but recommended)
- SSH client (PuTTY on Windows or terminal on Mac/Linux)

---

## Step 1: Launch EC2 Instance

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2)
2. Click **Launch Instance**
3. Configure:
   - **Name**: `primetalker-server`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance type**: `t2.micro` (Free tier) or `t2.small` for better performance
   - **Key pair**: Create new or select existing (.pem file)
   - **Security Group**: Allow these ports:
     - SSH (22) - Your IP
     - HTTP (80) - Anywhere
     - HTTPS (443) - Anywhere
4. Click **Launch Instance**

---

## Step 2: Connect to Your EC2 Instance

```bash
# On Windows (using PowerShell or Git Bash)
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Example:
ssh -i "C:\Users\bhanu\Downloads\primetalker-key.pem" ubuntu@54.123.45.67
```

> **Note**: If you get a permission error, run:
> ```bash
> chmod 400 your-key.pem
> ```

---

## Step 3: Install Required Software on EC2

Run these commands on your EC2 instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install Nginx (web server)
sudo apt install -y nginx

# Install PM2 (optional, for process management)
sudo npm install -g pm2
```

---

## Step 4: Build Your App Locally

On your local machine (Windows), run:

```bash
cd c:\Users\bhanu\Desktop\p1

# Install dependencies and build
npm install
npm run build
```

This creates a `dist/` folder with your production-ready files.

---

## Step 5: Upload Build Files to EC2

**Option A: Using SCP (Secure Copy)**

```bash
# From your local machine
scp -i "your-key.pem" -r dist/* ubuntu@your-ec2-ip:/home/ubuntu/primetalker/
```

**Option B: Using FileZilla (SFTP)**
1. Open FileZilla
2. Host: `sftp://your-ec2-ip`
3. Username: `ubuntu`
4. Key file: Your .pem file
5. Upload the `dist/` folder contents

**Option C: Using Git (Recommended for updates)**
```bash
# On EC2 instance
cd /home/ubuntu
git clone https://github.com/your-username/your-repo.git primetalker
cd primetalker
npm install
npm run build
```

---

## Step 6: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/primetalker
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com your-ec2-public-ip;
    
    root /home/ubuntu/primetalker/dist;
    index index.html;
    
    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Enable the site:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/primetalker /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 7: Set Up SSL (HTTPS) with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically
```

---

## Step 8: Set Environment Variables

Create a `.env` file with your production values:

```bash
# If using a backend or API
sudo nano /home/ubuntu/primetalker/.env
```

For Vite apps, environment variables are baked in at build time. Rebuild with production values:
```bash
VITE_SUPABASE_URL=your-url VITE_SUPABASE_ANON_KEY=your-key npm run build
```

---

## 🔄 Updating Your App

Whenever you make changes:

```bash
# 1. Build locally
npm run build

# 2. Upload to EC2
scp -i "your-key.pem" -r dist/* ubuntu@your-ec2-ip:/home/ubuntu/primetalker/dist/

# 3. No need to restart Nginx for static files!
```

Or if using Git on EC2:
```bash
cd /home/ubuntu/primetalker
git pull
npm run build
```

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Start Nginx | `sudo systemctl start nginx` |
| Stop Nginx | `sudo systemctl stop nginx` |
| Restart Nginx | `sudo systemctl restart nginx` |
| View Nginx logs | `sudo tail -f /var/log/nginx/error.log` |
| Check disk space | `df -h` |
| Check memory | `free -m` |

---

## 🔒 Security Checklist

- [ ] Disable password authentication (use SSH keys only)
- [ ] Set up UFW firewall
- [ ] Keep system updated (`sudo apt update && sudo apt upgrade`)
- [ ] Use HTTPS with valid SSL certificate
- [ ] Set up fail2ban for brute-force protection

