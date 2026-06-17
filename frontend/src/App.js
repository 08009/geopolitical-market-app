import React, { useState, useEffect } from 'react';
import { analyzeEvent, getHistory, getLatestNews } from './services/api';
import Auth from './components/Auth';
import { supabase } from './services/supabaseClient';
import './App.css';

const analyzingSteps = [
  'Collecting News Data',
  'Identifying Event Type',
  'Matching Historical Precedents',
  'Evaluating Market Impact',
  'Analyzing Sector Exposure',
  'Generating Market Intelligence Report'
];

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [event, setEvent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('analyze');
  const [history, setHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      getHistory().then(data => setHistory(data.history || [])).catch(() => {});
    }
    if (activeTab === 'news') {
      getLatestNews().then(data => setNews(data.news || [])).catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (!loading) {
      setAnalyzeStep(0);
      return;
    }
    const interval = setInterval(() => {
      setAnalyzeStep(prev => (prev < analyzingSteps.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalyze = async () => {
    if (!event.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowTrace(false);

    try {
      const data = await analyzeEvent(event);
      setResult(data);
    } catch (err) {
      setError('Analysis failed. Make sure backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getColor = (impact) => {
    if (impact === 'POSITIVE') return '#22c55e';
    if (impact === 'NEGATIVE') return '#ef4444';
    return '#6b7280';
  };

  if (checkingAuth) {
    return (
      <div className="spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner-circle"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const analysis = result?.analysis;

  return (
    <div className="App">
      <div className="profile-bar">
        <span className="profile-email">👤 {user.email}</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
      <header className="header">
        <h1>🌍 Geopolitical Market Intelligence Platform</h1>
        <p>Enter a news event to see its impact on Indian markets</p>
      </header>

      <div className="nav-tabs">
        <button className={activeTab === 'analyze' ? 'active' : ''} onClick={() => setActiveTab('analyze')}>
          Analyze
        </button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          History
        </button>
        <button className={activeTab === 'news' ? 'active' : ''} onClick={() => setActiveTab('news')}>
          Latest News
        </button>
      </div>

      {activeTab === 'analyze' && (
        <>
          <div className="input-section">
            <textarea
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="E.g., Russia announces new sanctions on oil exports..."
              rows={4}
            />
            <button onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Impact'}
            </button>
          </div>

          {loading && (
            <div className="analyzing-steps">
              {analyzingSteps.map((step, i) => (
                <div key={i} className={`step ${i < analyzeStep ? 'done' : i === analyzeStep ? 'active' : ''}`}>
                  {i < analyzeStep ? '✓ ' : ''}{step}
                </div>
              ))}
            </div>
          )}

          {error && <div className="error">{error}</div>}

          {analysis && (
            <div className="results">

              {/* Executive Summary */}
              <div className="summary-card">
                {analysis.event_classification && (
                  <div className="classification-row">
                    <span className="class-badge">{analysis.event_classification.type}</span>
                    <span className={`class-badge severity-${(analysis.event_classification.severity || '').toLowerCase()}`}>
                      Severity: {analysis.event_classification.severity}
                    </span>
                    <span className="class-badge">India Exposure: {analysis.event_classification.india_exposure}</span>
                  </div>
                )}
                <h2>Market Intelligence Report</h2>
                <p>{analysis.executive_summary || analysis.summary}</p>
              </div>

              {/* Overall Market Impact */}
              {analysis.overall_market_impact && (
                <div className="summary-card">
                  <h2>Overall Market Impact</h2>
                  <div className="prob-label">
                    <span>Direction: {analysis.overall_market_impact.direction}</span>
                    <span>{analysis.overall_market_impact.probability}%</span>
                  </div>
                  <div className="prob-bar-container">
                    <div className="prob-bar-fill" style={{
                      width: `${analysis.overall_market_impact.probability || 0}%`,
                      background: getColor(analysis.overall_market_impact.direction)
                    }}></div>
                  </div>

                  <div className="risk-meter">
                    <div className={`risk-dot risk-${(analysis.overall_market_impact.risk_level || '').toLowerCase()}`}></div>
                    <div>
                      <strong>Risk Level: {analysis.overall_market_impact.risk_level}</strong>
                      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{analysis.overall_market_impact.risk_explanation}</p>
                    </div>
                  </div>

                  {analysis.overall_market_impact.nifty_impact && (
                    <>
                      <h3 style={{ marginTop: 16, fontSize: 14 }}>Nifty 50 Forecast</h3>
                      <div className="forecast-table">
                        {Object.entries(analysis.overall_market_impact.nifty_impact).map(([k, v]) => (
                          <div className="forecast-cell" key={k}>
                            <div className="label">{k.replace(/_/g, ' ').toUpperCase()}</div>
                            <div className="value">{v}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {analysis.overall_market_impact.sensex_impact && (
                    <>
                      <h3 style={{ marginTop: 16, fontSize: 14 }}>Sensex Forecast</h3>
                      <div className="forecast-table">
                        {Object.entries(analysis.overall_market_impact.sensex_impact).map(([k, v]) => (
                          <div className="forecast-cell" key={k}>
                            <div className="label">{k.replace(/_/g, ' ').toUpperCase()}</div>
                            <div className="value">{v}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sectors */}
              <h2>Sectors Impacted</h2>
              <div className="sectors-grid">
                {analysis.sectors?.map((sector, idx) => (
                  <div key={idx} className="sector-card" style={{ borderLeft: `4px solid ${getColor(sector.impact)}` }}>
                    <h3>{sector.name}</h3>
                    <div className="badges" style={{ marginBottom: 8 }}>
                      <span className="badge" style={{ background: getColor(sector.impact) }}>{sector.impact}</span>
                      {sector.impact_type && <span className="badge" style={{ background: '#3b82f6' }}>{sector.impact_type}</span>}
                    </div>

                    {sector.probability != null && (
                      <>
                        <div className="prob-label">
                          <span>Probability</span>
                          <span>{sector.probability}%</span>
                        </div>
                        <div className="prob-bar-container">
                          <div className="prob-bar-fill" style={{ width: `${sector.probability || 0}%`, background: getColor(sector.impact) }}></div>
                        </div>
                      </>
                    )}

                    {Array.isArray(sector.reasoning) ? (
                      <ul className="reasoning-list">
                        {sector.reasoning.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    ) : (
                      <p className="cardText" style={{ color: '#cbd5e1', fontSize: 13, marginTop: 8 }}>{sector.reasoning || sector.reason}</p>
                    )}

                    {sector.timeframes && (
                      <div className="timeframe-row">
                        {Object.entries(sector.timeframes).map(([k, v]) => (
                          <div className="timeframe-cell" key={k}>
                            <div className="tf-label">{k.replace(/_/g, ' ')}</div>
                            <div className="tf-value" style={{ color: getColor(v) }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {sector.winners?.length > 0 && (
                      <div className="wl-section">
                        <div className="wl-label">Beneficiaries</div>
                        <div className="wl-tags">{sector.winners.map((s, i) => <span key={i} className="wl-tag winner">{s}</span>)}</div>
                      </div>
                    )}

                    {sector.losers?.length > 0 && (
                      <div className="wl-section">
                        <div className="wl-label">At Risk</div>
                        <div className="wl-tags">{sector.losers.map((s, i) => <span key={i} className="wl-tag loser">{s}</span>)}</div>
                      </div>
                    )}

                    {!sector.winners && !sector.losers && sector.stocks?.length > 0 && (
                      <div className="stocks">
                        {sector.stocks.map((stock, i) => (
                          <span key={i} className="stock-tag">{stock}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Commodities */}
              {analysis.commodities?.length > 0 && (
                <>
                  <h2>Commodities</h2>
                  <div className="sectors-grid">
                    {analysis.commodities.map((c, idx) => (
                      <div key={idx} className="sector-card" style={{ borderLeft: `4px solid ${getColor(c.price_impact || c.impact)}` }}>
                        <h3>{c.name}</h3>
                        <div className="badges" style={{ marginBottom: 8 }}>
                          <span className="badge" style={{ background: getColor(c.price_impact || c.impact) }}>
                            Price: {c.price_impact || c.impact}
                          </span>
                          {c.india_economic_impact && (
                            <span className="badge" style={{ background: getColor(c.india_economic_impact) }}>
                              India Impact: {c.india_economic_impact}
                            </span>
                          )}
                        </div>
                        {c.probability != null && (
                          <div className="prob-label"><span>Probability</span><span>{c.probability}%</span></div>
                        )}
                        <p className="cardText" style={{ color: '#cbd5e1', fontSize: 13, marginTop: 8 }}>{c.reasoning}</p>
                        {c.beneficiary_stocks?.length > 0 && (
                          <div className="wl-section">
                            <div className="wl-label">Beneficiaries</div>
                            <div className="wl-tags">{c.beneficiary_stocks.map((s, i) => <span key={i} className="wl-tag winner">{s}</span>)}</div>
                          </div>
                        )}
                        {c.loser_stocks?.length > 0 && (
                          <div className="wl-section">
                            <div className="wl-label">At Risk</div>
                            <div className="wl-tags">{c.loser_stocks.map((s, i) => <span key={i} className="wl-tag loser">{s}</span>)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Currency & Bonds */}
              <div className="extra-info">
                <div className="info-card">
                  <h3>💱 Currency (USD/INR)</h3>
                  <p>
                    <strong>{analysis.currency?.usd_inr}</strong>
                    {analysis.currency?.probability != null && ` (${analysis.currency.probability}%)`}
                  </p>
                  {analysis.currency?.expected_range && <p>Expected Range: {analysis.currency.expected_range}</p>}
                  <p>{analysis.currency?.reasoning || analysis.currency?.reason}</p>
                </div>
                <div className="info-card">
                  <h3>📊 Bonds</h3>
                  <p style={{ color: getColor(analysis.bonds?.impact) }}>
                    <strong>{analysis.bonds?.impact}</strong>
                    {analysis.bonds?.probability != null && ` (${analysis.bonds.probability}%)`}
                  </p>
                  {analysis.bonds?.yield_direction && <p>Yield Direction: {analysis.bonds.yield_direction}</p>}
                  <p>{analysis.bonds?.reasoning || analysis.bonds?.reason}</p>
                </div>
              </div>

              {/* Historical Matches */}
              {analysis.historical_matches?.length > 0 && (
                <>
                  <h2>Historical Matches</h2>
                  {analysis.historical_matches.map((h, i) => (
                    <div className="hist-match" key={i}>
                      <div className="hist-match-header">
                        <span className="hist-match-name">{h.event}</span>
                        <span className="similarity-badge">{h.similarity}% match</span>
                      </div>
                      <div className="hist-stats">
                        <div className="hist-stat"><div className="label">Initial Impact</div><div className="value">{h.initial_nifty_impact}</div></div>
                        <div className="hist-stat"><div className="label">30-Day Perf</div><div className="value">{h['30_day_performance']}</div></div>
                        <div className="hist-stat"><div className="label">Recovery</div><div className="value">{h.recovery_days} days</div></div>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                        Best: {h.best_sectors?.join(', ')} | Worst: {h.worst_sectors?.join(', ')}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Scenario Analysis */}
              {analysis.scenario_analysis && (
                <>
                  <h2>Scenario Analysis</h2>
                  <div className="scenario-grid">
                    {Object.values(analysis.scenario_analysis).map((s, i) => (
                      <div className="scenario-card" key={i}>
                        <div className="scenario-name">{s.name}</div>
                        <div className="scenario-prob">{s.probability}%</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Nifty: {s.nifty_impact}</div>
                        <p className="cardText" style={{ color: '#cbd5e1', fontSize: 13 }}>{s.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Winners / Losers */}
              {analysis.winners_losers && (
                <>
                  <h2>Likely Winners & Losers</h2>
                  <div className="extra-info">
                    <div className="info-card">
                      <h3>🏆 Top Winners</h3>
                      {analysis.winners_losers.top_winners?.map((w, i) => (
                        <div key={i} style={{ marginTop: 8 }}>
                          <span className="wl-tag winner">{w.stock}</span>{' '}
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>{w.sector}</span>
                          <p className="cardText" style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4 }}>{w.reason}</p>
                        </div>
                      ))}
                    </div>
                    <div className="info-card">
                      <h3>⚠️ Top Losers</h3>
                      {analysis.winners_losers.top_losers?.map((w, i) => (
                        <div key={i} style={{ marginTop: 8 }}>
                          <span className="wl-tag loser">{w.stock}</span>{' '}
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>{w.sector}</span>
                          <p className="cardText" style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4 }}>{w.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Investment Thesis */}
              {analysis.investment_thesis && (
                <div className="summary-card thesis-card">
                  <h2>📋 Market Intelligence Summary</h2>
                  <p>{analysis.investment_thesis}</p>
                </div>
              )}

             {/* Assumptions */}
              {analysis.assumptions?.length > 0 && (
                <div className="summary-card">
                  <h2>📌 Assumptions</h2>
                  <ul className="assumptions-list">
                    {analysis.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}

              {/* Key Risks */}
              {analysis.key_risks?.length > 0 && (
                <div className="summary-card">
                  <h2>⚠️ Key Risks</h2>
                  {analysis.key_risks.map((r, i) => {
                    if (typeof r === 'string') {
                      return <div className="risk-tag" key={i}>{r}</div>;
                    }
                    return (
                      <div className="risk-item" key={i}>
                        <div className="risk-text">{r.risk}</div>
                        <div className="risk-tags-row">
                          <span className={`risk-pill ${(r.probability || '').toLowerCase()}`}>
                            Probability: {r.probability}
                          </span>
                          <span className={`risk-pill ${(r.impact || '').toLowerCase()}`}>
                            Impact: {r.impact}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Historical Precedent (old format fallback) */}
              {analysis.historical_precedent && (
                <div className="historical">
                  <h3>📜 Historical Precedent</h3>
                  <p>{analysis.historical_precedent}</p>
                </div>
              )}

              {/* Methodology / Reasoning Trace */}
              {(analysis.reasoning_trace || analysis.news_factors_considered) && (
                <>
                  <button className="trace-toggle" onClick={() => setShowTrace(!showTrace)}>
                    {showTrace ? 'Hide' : 'Show'} Analysis Methodology
                  </button>
                  {showTrace && (
                    <div className="trace-content">
                      {analysis.reasoning_trace?.event_type_identified && (
                        <p><strong>Event Type Identified:</strong> {analysis.reasoning_trace.event_type_identified}</p>
                      )}
                      {analysis.reasoning_trace?.historical_events_matched?.length > 0 && (
                        <p><strong>Historical Events Matched:</strong> {analysis.reasoning_trace.historical_events_matched.join(', ')}</p>
                      )}
                      {analysis.reasoning_trace?.sentiment && (
                        <p><strong>Sentiment:</strong> {analysis.reasoning_trace.sentiment}</p>
                      )}
                      {analysis.reasoning_trace?.market_sensitivity && (
                        <p><strong>Market Sensitivity:</strong> {analysis.reasoning_trace.market_sensitivity}</p>
                      )}
                      {analysis.reasoning_trace?.overall_confidence != null && (
                        <p><strong>Overall Confidence:</strong> {analysis.reasoning_trace.overall_confidence}%</p>
                      )}
                      {analysis.news_factors_considered?.length > 0 && (
                        <p><strong>Factors Considered:</strong> {analysis.news_factors_considered.join(', ')}</p>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div>
          <h2 style={{ marginBottom: 16 }}>Past Analyses</h2>
          {history.length === 0 && <p style={{ color: '#94a3b8' }}>No analyses yet. Go analyze something!</p>}
          {history.map((item, idx) => (
            <div
              key={idx}
              className="history-item"
              onClick={() => {
                setResult({ analysis: item.full_analysis, event: item.event_description });
                setActiveTab('analyze');
                setShowTrace(false);
              }}
            >
              <p>{item.event_description}</p>
              <div className="badges" style={{ marginTop: 8 }}>
                <span className="badge" style={{ background: getColor(item.overall_impact) }}>
                  {item.overall_impact}
                </span>
                <span className="badge" style={{ background: '#3b82f6' }}>
                  {item.confidence_level}
                </span>
              </div>
              <p className="date">{new Date(item.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'news' && (
        <div>
          <h2 style={{ marginBottom: 16 }}>Latest Business News (India)</h2>
          {news.length === 0 && <p style={{ color: '#94a3b8' }}>Loading news...</p>}
          {news.map((item, idx) => (
            <div key={idx} className="news-item">
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              <a href={item.url} target="_blank" rel="noreferrer">Read more →</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;