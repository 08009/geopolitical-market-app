const express = require('express');
const router = express.Router();
const { 
  getStockQuote, 
  getIndianMarketOverview, 
  getCommodityPrice,
  getUSDINR 
} = require('../services/marketService');

// GET /api/market/overview
router.get('/overview', async (req, res) => {
  try {
    const overview = await getIndianMarketOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

// GET /api/market/stock/:symbol
router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getStockQuote(symbol);
    res.json({ success: true, data: quote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock quote' });
  }
});

// GET /api/market/commodity/:name
router.get('/commodity/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const price = await getCommodityPrice(name);
    res.json({ success: true, data: price });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch commodity price' });
  }
});

// GET /api/market/currency
router.get('/currency', async (req, res) => {
  try {
    const rate = await getUSDINR();
    res.json({ success: true, data: rate });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch currency rate' });
  }
});

module.exports = router;