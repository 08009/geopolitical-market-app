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
    Array.isArray(data?.assumptions) && data.assumptions.length > 0 &&
    Array.isArray(data?.sectors) && data.sectors.length > 0 &&
    data.sectors[0]?.probability != null &&
    Array.isArray(data.sectors[0]?.reasoning)
  );
};

const validateAdvanced = (data) => {
  return !!(
    Array.isArray(data?.historical_matches) && data.historical_matches.length > 0 &&
    data?.scenario_analysis?.scenario_1 &&
    data?.winners_losers?.top_winners &&
    Array.isArray(data?.key_risks) && data.key_risks.length > 0 &&
    typeof data.key_risks[0] === 'object' &&
    data.key_risks[0]?.risk
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

LIVE MARKET DATA (this is real, current data fetched moments ago — you MUST treat these as ground truth and anchor every forecast to them, NOT to any value you recall from training):
${JSON.stringify(marketData, null, 2)}

CRITICAL ANCHORING RULES:
- If a live USD/INR rate is provided above, your "expected_range" for currency MUST be anchored to that exact live rate, NEVER to a historical/remembered USD/INR level.
- If live Nifty, Sensex, crude oil, or gold prices are provided above, treat them as the current baseline. Your "nifty_impact" and "sensex_impact" percentage forecasts must be percentage CHANGES from these live levels, not independent invented numbers.
- If live market data fields are null/missing, explicitly lower your confidence for that specific prediction and state in your reasoning that live data was unavailable, rather than silently guessing an absolute number.

DIRECTIONAL CONSISTENCY RULE for currency.expected_range (this is mandatory, check it before responding):
- If usd_inr is "DEPRECIATE" (rupee weakens, rate goes UP): the range must be mostly or entirely ABOVE the live rate. Example: if live rate is 94.5, output something like "94.5 - 96.0" or "94.8 - 96.3" — NOT a range that dips below the live rate.
- If usd_inr is "APPRECIATE" (rupee strengthens, rate goes DOWN): the range must be mostly or entirely BELOW the live rate. Example: if live rate is 94.5, output something like "93.0 - 94.5" — NOT a range that rises above the live rate.
- If usd_inr is "STABLE": the range should be a narrow band closely straddling the live rate, e.g. "94.0 - 95.0" for a live rate of 94.5.
- A range that straddles the live rate evenly while claiming DEPRECIATE or APPRECIATE is WRONG and contradicts itself. Double-check your range matches your stated direction before finalizing.

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
  "assumptions": [
    "Assumption 1 (e.g. no new sanctions are imposed)",
    "Assumption 2 (e.g. no major domestic policy shock)",
    "Assumption 3 (e.g. no global recession during this period)"
  ],
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

IMPORTANT — exact field names required for commodities: use "india_economic_impact" (NOT "inds_economic_impact" or any other spelling) and "loser_stocks" (NOT "loser_stock"). Copy these field names exactly as shown character-by-character.
"currency": {
    "usd_inr": "APPRECIATE / DEPRECIATE / STABLE",
    "probability": 72,
    "expected_range": "MUST skew toward the predicted direction, anchored to the live rate. See DIRECTIONAL CONSISTENCY RULE below.",
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

Populate every field with your best estimate, including "assumptions" (3 items) — this field is MANDATORY and must never be omitted. Provide 3-5 sectors and 2-3 commodities minimum. Return complete valid JSON only.`
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
  "key_risks": [
    {"risk": "Description of the risk", "probability": "Low / Medium / High", "impact": "Low / Medium / High"}
  ],
  "reasoning_trace": {
    "event_type_identified": "type",
    "historical_events_matched": ["Event1", "Event2"],
    "sentiment": "Negative / Positive / Neutral",
    "market_sensitivity": "High / Medium / Low",
    "overall_confidence": 81
  },
  "news_factors_considered": ["Factor 1", "Factor 2", "Factor 3"]
}

Provide at least 2 historical matches, all 3 scenarios, 2-3 winners and 2-3 losers, and 3-4 key_risks.

MANDATORY key_risks FORMAT — each entry MUST be an OBJECT, never a plain string. Example of CORRECT format:
"key_risks": [
  {"risk": "Further unexpected RBI tightening", "probability": "Medium", "impact": "High"},
  {"risk": "Escalating global inflation", "probability": "Low", "impact": "Medium"}
]
INCORRECT format (do NOT do this): "key_risks": ["Further unexpected RBI tightening"]

Return complete valid JSON only.`
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