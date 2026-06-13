const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const analyzeRoutes = require('./routes/analyze');
const marketRoutes = require('./routes/market');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/analyze', analyzeRoutes);
app.use('/api/market', marketRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Geopolitical Market API is running!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});