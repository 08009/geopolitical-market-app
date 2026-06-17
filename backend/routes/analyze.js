const express = require('express');
const router = express.Router();
const { analyzeEvent } = require('../services/claudeService');
const { getIndianMarketOverview, getUSDINR } = require('../services/marketService');
const { searchNews } = require('../services/newsService');
const supabase = require('../config/db');

// POST /api/analyze
router.post('/', async (req, res) => {
  try {
    const { event, user_id } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Event description is required' });
    }

    console.log('Analyzing event:', event);

    // Fetch current market data
    const marketOverview = await getIndianMarketOverview();
    const usdInr = await getUSDINR();
    const relatedNews = await searchNews(event);

    const marketData = {
      market: marketOverview,
      currency: usdInr,
      relatedNews: relatedNews.map(n => ({
        title: n.title,
        description: n.description
      }))
    };

    // Get AI analysis
    const analysis = await analyzeEvent(event, marketData);

    // Safety net: normalize known field-name typos the AI occasionally produces
    if (Array.isArray(analysis.commodities)) {
      analysis.commodities = analysis.commodities.map(c => ({
        ...c,
        india_economic_impact: c.india_economic_impact ?? c.inds_economic_impact ?? null,
        loser_stocks: c.loser_stocks ?? c.loser_stock ?? []
      }));
    }

    // Safety net: if key_risks came back as plain strings instead of objects, convert them
    if (Array.isArray(analysis.key_risks)) {
      analysis.key_risks = analysis.key_risks.map(r => {
        if (typeof r === 'string') {
          return { risk: r, probability: 'Medium', impact: 'Medium' };
        }
        return r;
      });
    }

    // Safety net: if assumptions is missing entirely, provide a generic fallback so UI doesn't break
    if (!Array.isArray(analysis.assumptions) || analysis.assumptions.length === 0) {
      analysis.assumptions = [
        'No major unforeseen escalation beyond the scope of this event',
        'No significant policy surprise from RBI or other regulators during this period',
        'Global macro conditions remain broadly stable'
      ];
    }

    // Save event to database
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert([{ description: event, user_id: user_id }])
      .select();

    if (eventError) console.error('Error saving event:', eventError);

    // Save analysis to database
    const { data: analysisData, error: analysisError } = await supabase
      .from('analyses')
      .insert([{
        event_id: eventData?.[0]?.id,
        event_description: event,
        user_id: user_id,
       overall_impact: analysis.overall_market_impact?.direction,
        confidence_level: analysis.confidence_level,
        time_horizon: analysis.time_horizon,
        full_analysis: analysis
      }])
      .select();

    if (analysisError) console.error('Error saving analysis:', analysisError);

    // Save sector predictions
    if (analysisData?.[0]?.id && analysis.sectors) {
      const sectorRows = analysis.sectors.map(sector => ({
        analysis_id: analysisData[0].id,
        sector_name: sector.name,
        impact: sector.impact,
        magnitude: sector.magnitude,
        reason: sector.reason,
        stocks: sector.stocks
      }));

      const { error: sectorError } = await supabase
        .from('sector_predictions')
        .insert(sectorRows);

      if (sectorError) console.error('Error saving sectors:', sectorError);
    }

    // Return full response
    res.json({
      success: true,
      event: event,
      timestamp: new Date().toISOString(),
      marketData: marketData,
      analysis: analysis,
      saved: !!analysisData?.[0]?.id
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

// GET /api/analyze/news
router.get('/news', async (req, res) => {
  try {
    const { getLatestNews } = require('../services/newsService');
    const news = await getLatestNews();
    res.json({ success: true, news });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/analyze/history
router.get('/history', async (req, res) => {
  try {
    const { user_id } = req.query;

    let query = supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, history: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;