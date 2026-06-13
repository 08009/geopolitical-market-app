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

// Get Indian market overview (Nifty 50, Sensex)
const getIndianMarketOverview = async () => {
  try {
    const nifty = await getStockQuote('NIFTY50.BSE');
    const sensex = await getStockQuote('SENSEX.BSE');
    
    return {
      nifty50: nifty,
      sensex: sensex,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching Indian market overview:', error);
    return {
      nifty50: null,
      sensex: null,
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

// Get USD to INR exchange rate
const getUSDINR = async () => {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=INR&apikey=${ALPHA_VANTAGE_KEY}`
    );
    return response.data['Realtime Currency Exchange Rate'];
  } catch (error) {
    console.error('Error fetching USD/INR rate:', error);
    return null;
  }
};

module.exports = {
  getStockQuote,
  getIndianMarketOverview,
  getCommodityPrice,
  getUSDINR
};