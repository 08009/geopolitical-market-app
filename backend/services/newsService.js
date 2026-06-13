const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Get latest geopolitical news
const getLatestNews = async () => {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=India+stock+market&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`
    );
    return response.data.articles.slice(0, 10);
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};

// Search news by keyword
const searchNews = async (keyword) => {
  try {
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${keyword}+india+market&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`
    );
    return response.data.articles.slice(0, 5);
  } catch (error) {
    console.error('Error searching news:', error);
    return [];
  }
};

module.exports = {
  getLatestNews,
  searchNews
};