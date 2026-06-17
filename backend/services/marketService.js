const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;

// Get stock quote from Alpha Vantage
const getStockQuote = async (symbol) => {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
    );
    return response.data['Global Quote'];
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    return null;
  }
};

// Get Indian market overview (Nifty 50, Sensex) using a free Yahoo Finance endpoint (no key needed)
const getYahooQuote = async (symbol) => {
  try {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const result = response.data?.chart?.result?.[0];
    const meta = result?.meta;
    if (meta?.regularMarketPrice) {
      return {
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose ?? meta.chartPreviousClose,
        changePercent: meta.previousClose
          ? (((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2)
          : null
      };
    }
    return null;
  } catch (error) {
    console.warn(`Yahoo quote fetch failed for ${symbol}:`, error.message);
    return null;
  }
};

const getIndianMarketOverview = async () => {
  try {
    const [nifty, sensex, crudeOil, gold] = await Promise.all([
      getYahooQuote('%5ENSEI'),     // Nifty 50
      getYahooQuote('%5EBSESN'),    // Sensex
      getYahooQuote('CL=F'),        // WTI Crude Oil futures
      getYahooQuote('GC=F')         // Gold futures
    ]);

    return {
      nifty50: nifty,
      sensex: sensex,
      crudeOilWTI: crudeOil,
      gold: gold,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Indian market overview:', error);
    return {
      nifty50: null,
      sensex: null,
      crudeOilWTI: null,
      gold: null,
      timestamp: new Date().toISOString()
    };
  }
};

// Get commodity prices
const getCommodityPrice = async (commodity) => {
  try {
    const commodityMap = {
      'gold': 'XAUUSD',
      'silver': 'XAGUSD',
      'crude_oil': 'USOIL',
    };

    const symbol = commodityMap[commodity] || commodity;
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${ALPHA_VANTAGE_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching commodity price:', error);
    return null;
  }
};

// Get USD to INR exchange rate, with a free fallback if Alpha Vantage fails/rate-limits
const getUSDINR = async () => {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=INR&apikey=${ALPHA_VANTAGE_KEY}`
    );
    const rate = response.data['Realtime Currency Exchange Rate'];
    if (rate && rate['5. Exchange Rate']) {
      return {
        rate: parseFloat(rate['5. Exchange Rate']),
        source: 'alphavantage',
        timestamp: rate['6. Last Refreshed'] || new Date().toISOString()
      };
    }
    throw new Error('Alpha Vantage returned no rate, trying fallback');
  } catch (error) {
    console.warn('Alpha Vantage USD/INR failed, using fallback API:', error.message);
    try {
      const fallback = await axios.get('https://open.er-api.com/v6/latest/USD');
      const inrRate = fallback.data?.rates?.INR;
      if (inrRate) {
        return {
          rate: inrRate,
          source: 'fallback',
          timestamp: fallback.data?.time_last_update_utc || new Date().toISOString()
        };
      }
      return null;
    } catch (fallbackError) {
      console.error('Fallback USD/INR fetch also failed:', fallbackError.message);
      return null;
    }
  }
};

module.exports = {
  getStockQuote,
  getIndianMarketOverview,
  getCommodityPrice,
  getUSDINR
};