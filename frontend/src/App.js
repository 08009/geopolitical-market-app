import React, { useState, useEffect } from 'react';
import { analyzeEvent, getHistory, getLatestNews } from './services/api';
import Auth from './components/Auth';
import { supabase } from './services/supabaseClient';
import './App.css';

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

  const handleAnalyze = async () => {
    if (!event.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeEvent(event);
      setResult(data);
    } catch (err) {
      setError('Analysis failed. Make sure backend is running on port 5000.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getImpactColor = (impact) => {
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

  return (
    <div className="App">
      <div className="profile-bar">
        <span className="profile-email">👤 {user.email}</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
      <header className="header">
        <h1>🌍 Geopolitical Market Impact Analyzer</h1>
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
            <div className="spinner">
              <div className="spinner-circle"></div>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          {result && (
            <div className="results">
              <div className="summary-card">
                <h2>Summary</h2>
                <p>{result.analysis.summary}</p>
                <div className="badges">
                  <span className="badge" style={{ background: getImpactColor(result.analysis.overall_market_impact) }}>
                    Overall: {result.analysis.overall_market_impact}
                  </span>
                  <span className="badge" style={{ background: '#3b82f6' }}>
                    Confidence: {result.analysis.confidence_level}
                  </span>
                  <span className="badge" style={{ background: '#8b5cf6' }}>
                    {result.analysis.time_horizon}
                  </span>
                </div>
              </div>

              <h2>Sectors Impacted</h2>
              <div className="sectors-grid">
                {result.analysis.sectors?.map((sector, idx) => (
                  <div key={idx} className="sector-card" style={{ borderLeft: `4px solid ${getImpactColor(sector.impact)}` }}>
                    <h3>{sector.name}</h3>
                    <span className="impact-tag" style={{ color: getImpactColor(sector.impact) }}>
                      {sector.impact} ({sector.magnitude})
                    </span>
                    <p>{sector.reason}</p>
                    <div className="stocks">
                      {sector.stocks?.map((stock, i) => (
                        <span key={i} className="stock-tag">{stock}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {result.analysis.commodities?.length > 0 && (
                <>
                  <h2>Commodities</h2>
                  <div className="sectors-grid">
                    {result.analysis.commodities.map((c, idx) => (
                      <div key={idx} className="sector-card" style={{ borderLeft: `4px solid ${getImpactColor(c.impact)}` }}>
                        <h3>{c.name}</h3>
                        <span className="impact-tag" style={{ color: getImpactColor(c.impact) }}>
                          {c.impact} ({c.magnitude})
                        </span>
                        <p>{c.reason}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="extra-info">
                <div className="info-card">
                  <h3>💱 Currency (USD/INR)</h3>
                  <p><strong>{result.analysis.currency?.usd_inr}</strong></p>
                  <p>{result.analysis.currency?.reason}</p>
                </div>
                <div className="info-card">
                  <h3>📊 Bonds</h3>
                  <p style={{ color: getImpactColor(result.analysis.bonds?.impact) }}>
                    <strong>{result.analysis.bonds?.impact}</strong>
                  </p>
                  <p>{result.analysis.bonds?.reason}</p>
                </div>
              </div>

              <div className="historical">
                <h3>📜 Historical Precedent</h3>
                <p>{result.analysis.historical_precedent}</p>
              </div>
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
              }}
            >
              <p>{item.event_description}</p>
              <div className="badges" style={{ marginTop: 8 }}>
                <span className="badge" style={{ background: getImpactColor(item.overall_impact) }}>
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