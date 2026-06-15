const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `You are a senior geopolitical market analyst at a top-tier hedge fund specializing in Indian markets.
You have 20+ years of experience analyzing how global events impact Indian equities, commodities, currencies and bonds.
You think in probabilities, not certainties. You always cite historical precedents with specific data.
Always respond with valid JSON only. No extra text. No markdown.`;

const callWithRetry = async (fn, validate, maxAttempts = 3) => {
  let lastResult;
  for (let i = 0; i < maxAttempts; i++) {
    lastResult = await fn();
    if (validate(lastResult)) return lastResult;
    console.warn(`Validation failed, attempt ${i + 1}/${maxAttempts}, retrying...`);
  }
  return lastResult;
};

const validateCore = (data) => {
  return !!(
    data?.overall_market_impact?.direction &&
    typeof data?.overall_market_impact?.probability === 'number' &&
    data?.overall_market_impact?.risk_level &&
    data?.overall_market_impact?.nifty_impact &&
    Array.isArray(data?.sectors) && data.sectors.length > 0 &&
    data.sectors[0]?.probability != null &&
    Array.isArray(data.sectors[0]?.reasoning)
  );
};

const validateAdvanced = (data) => {
  return !!(
    Array.isArray(data?.historical_matches) && data.historical_matches.length > 0 &&
    data?.scenario_analysis?.scenario_1 &&
    data?.winners_losers?.top_winners
  );
};

// CALL 1 — Core Analysis
const getCoreAnalysis = async (eventDescription, marketData) => {
  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze this geopolitical/political event and its impact on Indian markets:

EVENT: ${eventDescription}

CURRENT MARKET DATA: ${JSON.stringify(marketData)}

Return ONLY this exact JSON structure, fully populated, no field left empty:

{
  "event_classification": {
    "type": "Military Conflict / Election / Trade War / Sanctions / Natural Disaster / Energy Crisis / Policy Change / Other",
    "severity": "Low / Medium / High / Critical",
    "affected_regions": ["region1", "region2"],
    "india_exposure": "Direct / Indirect / Minimal"
  },
  "executive_summary": "2-3 sentence professional summary",
  "overall_market_impact": {
    "direction": "POSITIVE / NEGATIVE / NEUTRAL",
    "probability": 75,
    "risk_level": "Low / Medium / High / Critical",
    "risk_explanation": "why this risk level",
    "nifty_impact": {
      "1_day": "-0.8% to -1.5%",
      "1_week": "-0.5% to +0.3%",
      "1_month": "Recovery likely",
      "3_months": "Neutral to positive"
    },
    "sensex_impact": {
      "1_day": "-0.8% to -1.5%",
      "1_week": "-0.5% to +0.3%",
      "1_month": "Recovery likely",
      "3_months": "Neutral to positive"
    }
  },
  "sectors": [
    {
      "name": "Sector name",
      "impact": "POSITIVE / NEGATIVE / NEUTRAL",
      "impact_type": "Direct / Indirect / Minimal",
      "probability": 84,
      "confidence": 91,
      "magnitude": "HIGH / MEDIUM / LOW",
      "reasoning": ["point 1", "point 2", "point 3"],
      "timeframes": {
        "1_day": "POSITIVE / NEGATIVE / NEUTRAL",
        "1_week": "POSITIVE / NEGATIVE / NEUTRAL",
        "1_month": "POSITIVE / NEGATIVE / NEUTRAL",
        "6_months": "POSITIVE / NEGATIVE / NEUTRAL"
      },
      "winners": ["Stock1", "Stock2"],
      "losers": ["Stock1"],
      "key_stocks": ["Stock1", "Stock2", "Stock3"]
    }
  ],
  "commodities": [
    {
      "name": "Commodity name",
      "price_impact": "POSITIVE / NEGATIVE / NEUTRAL",
      "india_economic_impact": "POSITIVE / NEGATIVE / NEUTRAL",
      "probability": 78,
      "reasoning": "why affected",
      "magnitude": "HIGH / MEDIUM / LOW",
      "beneficiary_stocks": ["Stock1"],
      "loser_stocks": ["Stock1"]
    }
  ],
  "currency": {
    "usd_inr": "APPRECIATE / DEPRECIATE / STABLE",
    "probability": 72,
    "expected_range": "83.5 - 85.2",
    "reasoning": "why",
    "timeframe": "SHORT_TERM / MEDIUM_TERM"
  },
  "bonds": {
    "impact": "POSITIVE / NEGATIVE / NEUTRAL",
    "probability": 68,
    "reasoning": "why",
    "yield_direction": "UP / DOWN / STABLE"
  }
}

Populate every field with your best estimate. Provide 3-5 sectors and 2-3 commodities minimum. Return complete valid JSON only.`
      }
    ],
    temperature: 0,
    max_tokens: 4000
  });

  const text = completion.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
};

// CALL 2 — Advanced Analysis (uses Call 1 output as context)
const getAdvancedAnalysis = async (eventDescription, coreAnalysis) => {
  const context = {
    event_type: coreAnalysis.event_classification?.type,
    overall_direction: coreAnalysis.overall_market_impact?.direction,
    sectors: coreAnalysis.sectors?.map(s => ({ name: s.name, impact: s.impact }))
  };

  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Given this event and its core analysis, provide advanced market intelligence.

EVENT: ${eventDescription}

CORE ANALYSIS CONTEXT: ${JSON.stringify(context)}

Return ONLY this exact JSON structure, fully populated, no field left empty:

{
  "historical_matches": [
    {
      "event": "Event name and year",
      "similarity": 89,
      "initial_nifty_impact": "-1.4%",
      "30_day_performance": "+2.3%",
      "recovery_days": 12,
      "best_sectors": ["Sector1", "Sector2"],
      "worst_sectors": ["Sector1", "Sector2"]
    }
  ],
  "scenario_analysis": {
    "scenario_1": {
      "name": "De-escalation",
      "probability": 60,
      "nifty_impact": "+1% to +2%",
      "description": "what happens"
    },
    "scenario_2": {
      "name": "Status Quo",
      "probability": 30,
      "nifty_impact": "-0.5% to +0.5%",
      "description": "what happens"
    },
    "scenario_3": {
      "name": "Escalation",
      "probability": 10,
      "nifty_impact": "-3% to -5%",
      "description": "what happens"
    }
  },
  "winners_losers": {
    "top_winners": [
      {"stock": "Stock name", "sector": "Sector", "reason": "why"}
    ],
    "top_losers": [
      {"stock": "Stock name", "sector": "Sector", "reason": "why"}
    ]
  },
  "investment_thesis": "2-3 sentence professional investment thesis",
  "key_risks": ["Risk 1", "Risk 2", "Risk 3"],
  "reasoning_trace": {
    "event_type_identified": "type",
    "historical_events_matched": ["Event1", "Event2"],
    "sentiment": "Negative / Positive / Neutral",
    "market_sensitivity": "High / Medium / Low",
    "overall_confidence": 81
  },
  "news_factors_considered": ["Factor 1", "Factor 2", "Factor 3"]
}

Provide at least 2 historical matches, all 3 scenarios, 2-3 winners and 2-3 losers. Return complete valid JSON only.`
      }
    ],
    temperature: 0,
    max_tokens: 3000
  });

  const text = completion.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
};

const analyzeEvent = async (eventDescription, marketData) => {
  const core = await callWithRetry(
    () => getCoreAnalysis(eventDescription, marketData),
    validateCore,
    3
  );

  let advanced = {};
  try {
    advanced = await callWithRetry(
      () => getAdvancedAnalysis(eventDescription, core),
      validateAdvanced,
      2
    );
  } catch (err) {
    console.error('Advanced analysis failed, returning core only:', err.message);
  }

  return { ...core, ...advanced };
};

module.exports = { analyzeEvent };