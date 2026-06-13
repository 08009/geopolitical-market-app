const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const analyzeEvent = async (eventDescription, marketData) => {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are an expert financial analyst specializing in Indian markets. Always respond with valid JSON only, no extra text, no markdown backticks.'
      },
      {
        role: 'user',
        content: `Analyze this geopolitical/political event and its impact on Indian markets:

EVENT: ${eventDescription}

CURRENT MARKET DATA: ${JSON.stringify(marketData)}

Provide analysis in this exact JSON format:
{
  "summary": "Brief summary of the event",
  "overall_market_impact": "POSITIVE/NEGATIVE/NEUTRAL",
  "sectors": [
    {
      "name": "Sector name",
      "impact": "POSITIVE/NEGATIVE/NEUTRAL",
      "reason": "Why this sector is affected",
      "magnitude": "HIGH/MEDIUM/LOW",
      "stocks": ["Stock1", "Stock2", "Stock3"]
    }
  ],
  "commodities": [
    {
      "name": "Commodity name",
      "impact": "POSITIVE/NEGATIVE/NEUTRAL",
      "reason": "Why affected",
      "magnitude": "HIGH/MEDIUM/LOW"
    }
  ],
  "currency": {
    "usd_inr": "APPRECIATE/DEPRECIATE/STABLE",
    "reason": "Why INR moves this way"
  },
  "bonds": {
    "impact": "POSITIVE/NEGATIVE/NEUTRAL",
    "reason": "Why bonds are affected"
  },
  "historical_precedent": "Similar past event and what happened",
  "confidence_level": "HIGH/MEDIUM/LOW",
  "time_horizon": "SHORT_TERM/MEDIUM_TERM/LONG_TERM"
}`
      }
    ],
    temperature: 0.3,
    max_tokens: 2048
  });

  const text = completion.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return parsed;
};

module.exports = { analyzeEvent };