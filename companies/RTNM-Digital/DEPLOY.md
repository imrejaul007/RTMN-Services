# Deploy REZ SalesMind

## Quick Deploy

### Backend → Render
```bash
cd companies/RTNM-Digital/REZ-SalesMind
render blueprint create --spec render.yaml
```

### Frontend → Vercel
```bash
cd companies/RTNM-Digital/REZ-SalesMind/frontend
vercel --prod
```

## Manual Deploy

### Backend (Render)
1. Create new Web Service on Render
2. Connect GitHub repo
3. Set build command: `npm install && npm run build`
4. Set start command: `node dist/index.js`
5. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=5170`
   - `INTERNAL_SERVICE_TOKEN=<generate-strong-token>`
   - `ALLOWED_ORIGINS=https://your-frontend.vercel.app`
   - `HOJAI_WEB_INTEL=<your-hojai-url>`
   - Other service URLs...

### Frontend (Vercel)
1. Create new Next.js project on Vercel
2. Import from GitHub
3. Set root directory: `companies/RTNM-Digital/REZ-SalesMind/frontend`
4. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com`
5. Deploy

## Environment Variables

### Backend (Render)
```bash
# Required
NODE_ENV=production
PORT=5170
INTERNAL_SERVICE_TOKEN=<generate-with-openssl-rand-hex-32>
ALLOWED_ORIGINS=https://rez-salesmind.vercel.app

# HOJAI AI Services
HOJAI_WEB_INTEL=https://hojai-web-intel.onrender.com
HOJAI_MERCHANT_INTEL=https://hojai-merchant.onrender.com
HOJAI_LEAD_SERVICE=https://hojai-lead.onrender.com
HOJAI_KG=https://hojai-kg.onrender.com
HOJAI_TWIN_OS=https://hojai-twinos.onrender.com
GENIE_VOICE=https://genie-voice.onrender.com

# REZ Services
REZ_IDENTITY_HUB=https://corp-id.onrender.com
REZ_CRM_HUB=https://rez-crm.onrender.com
ASSETMIND=https://assetmind.onrender.com

# API Keys (optional - for real AI)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
HUBSPOT_API_KEY=...
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://rez-salesmind.onrender.com
```

## Post-Deploy

1. Update `ALLOWED_ORIGINS` in Render to your Vercel URL
2. Test health endpoint: `https://your-backend.onrender.com/health`
3. Test API: `https://your-backend.onrender.com/api/dashboard/stats`
4. Visit frontend: `https://your-frontend.vercel.app`
