# Deploy CYBER-CRYPT on Oracle Cloud Always Free (lowest latency)

Render’s free tier is often far from LATAM/EU players and adds cold-start latency.
Oracle Always Free ARM (`VM.Standard.A1.Flex`, 1–4 OCPU / 6–24 GB) is a better home for the game server + WebSocket.

## 1. Pick the closest region

| You play from | Prefer Oracle region |
|---------------|----------------------|
| México / Centroamérica | `us-ashburn-1` or `us-phoenix-1` |
| Colombia / Perú / Chile | `sa-saopaulo-1` (São Paulo) |
| España / UE | `eu-frankfurt-1` or `eu-madrid-1` |
| US East | `us-ashburn-1` |

Create the instance in **the region with the lowest ping from your ISP** (test with `ping` / cloudflare speed vs city).

## 2. Create the Always Free VM

1. [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) → sign up.
2. Compute → Instances → Create:
   - Shape: **VM.Standard.A1.Flex** (Ampere)
   - Image: **Ubuntu 22.04**
   - VCN: create default, open **ingress TCP 22, 80, 443** (and 3000 only if testing without nginx).
3. Download the SSH key; note the public IP.

## 3. One-shot install on the VM

```bash
ssh ubuntu@YOUR_PUBLIC_IP
curl -fsSL https://raw.githubusercontent.com/yukota04/CYBER-CRYPT/main/deploy/oracle/setup.sh -o setup.sh
# Or scp this repo's deploy/oracle/setup.sh
bash setup.sh
```

Then set secrets:

```bash
sudo mkdir -p /etc/cyber-crypt
sudo tee /etc/cyber-crypt/env <<'EOF'
NODE_ENV=production
PORT=3000
APP_URL=https://TU_DOMINIO_O_IP
DATABASE_URL=postgresql://...neon...
CLOUD_SAVE_SECRET=pon-un-secreto-largo-y-estable
EOF
sudo systemctl restart cyber-crypt
```

Keep using **Neon** for `DATABASE_URL` so accounts survive VM rebuilds.

## 4. HTTPS + WebSocket (recommended)

Point a domain A-record at the VM IP, then:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /opt/cyber-crypt/deploy/oracle/nginx.conf /etc/nginx/sites-available/cyber-crypt
sudo ln -sf /etc/nginx/sites-available/cyber-crypt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tu-dominio.com
```

Update `APP_URL` to `https://tu-dominio.com` and restart the service.

## 5. Point the game client at the VPS

- Set `APP_URL` on the server (CORS / OAuth callbacks).
- If the static site stays on Render but API/WS moves to the VPS, set the client WebSocket base to the VPS origin (see `VITE_WS_URL` / server proxy docs in `setup.sh` notes).

## 6. Verify latency

In-game (online) the HUD shows **FPS · N ms**. After moving the server to a nearby Oracle region you should see a large drop vs Render free (often 150–400 ms → much lower depending on ISP).

`curl -s https://TU_HOST/api/health` should return OK.
