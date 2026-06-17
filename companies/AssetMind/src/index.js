/**
 * AssetMind - Financial Forecasting Service
 * Port: 5200
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5200;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const auth = (req, res, next) => {
    if (['/health', '/api/health'].includes(req.path)) return next();
    const token = req.headers['x-internal-token'];
    if (!token || token !== INTERNAL_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};
app.use(auth);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'AssetMind', port: PORT }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AssetMind', port: PORT }));

app.get('/twin/revenue', (req, res) => {
    const { id } = req.query;
    res.json({
        id: id || 'default', revenue: 2500000, revenueGrowth: 15.5,
        projections: [
            { month: 'Jul', projected: 2800000 },
            { month: 'Aug', projected: 3100000 },
            { month: 'Sep', projected: 3400000 },
        ],
        confidence: 0.85
    });
});

app.get('/market', (req, res) => {
    res.json({
        indices: [
            { name: 'S&P 500', value: 5421.23, change: 0.45 },
            { name: 'NASDAQ', value: 17892.45, change: 0.78 },
        ],
        timestamp: new Date().toISOString()
    });
});

app.get('/assets', (req, res) => {
    res.json({
        assets: [
            { id: 'ast_001', name: 'REZ Corp', type: 'equity', value: 5000000, currency: 'USD' },
            { id: 'ast_002', name: 'TechStart Inc', type: 'equity', value: 1200000, currency: 'USD' },
            { id: 'ast_003', name: 'Global Holdings', type: 'portfolio', value: 8500000, currency: 'USD' },
        ],
        count: 3
    });
});

app.post('/forecast', (req, res) => {
    const { assetId, months = 6 } = req.body;
    const forecasts = [];
    for (let i = 1; i <= months; i++) {
        forecasts.push({
            month: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleString('default', { month: 'short' }),
            projected: 2500000 * (1 + 0.05 * i),
            confidence: 0.9 - (i * 0.05)
        });
    }
    res.json({ assetId, forecasts, generated: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`AssetMind v1.0.0 running on port ${PORT}`);
});
