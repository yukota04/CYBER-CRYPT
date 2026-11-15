<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/393b54c3-1a9c-407e-ab8c-a6043e64836b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Low-latency VPS (Oracle Always Free)

Render free is often high-ping. To host the game server on Oracle Cloud Ampere:

See [`deploy/oracle/README.md`](deploy/oracle/README.md) (`setup.sh`, nginx, Neon `DATABASE_URL`).

Optional build flag to point the browser WebSocket at the VPS while keeping the static site elsewhere:

`VITE_WS_HOST=tu-vps-dominio.com npm run build`
