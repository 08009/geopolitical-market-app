import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeEvent, getHistory, getLatestNews } from './src/services/api';
import { supabase } from './src/services/supabaseClient';
import Auth from './src/components/Auth';

const analyzingSteps = [
  'Collecting News Data',
  'Identifying Event Type',
  'Matching Historical Precedents',
  'Evaluating Market Impact',
  'Analyzing Sector Exposure',
  'Generating Market Intelligence Report'
];

export default function App() {
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
      setError('Analysis failed. Check backend connection.');
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

  const getRiskColor = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'low') return '#22c55e';
    if (l === 'medium') return '#f59e0b';
    return '#ef4444';
  };

  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const analysis = result?.analysis;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.profileBar}>
          <Text style={styles.profileEmail}>👤 {user.email}</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>🌍 Geopolitical Market Intelligence</Text>
        <Text style={styles.subtitle}>Impact on Indian markets</Text>

        <View style={styles.tabs}>
          {['analyze', 'history', 'news'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'analyze' ? 'Analyze' : tab === 'history' ? 'History' : 'News'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'analyze' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="E.g., Russia announces new sanctions..."
              placeholderTextColor="#64748b"
              multiline
              value={event}
              onChangeText={setEvent}
            />
            <TouchableOpacity style={styles.button} onPress={handleAnalyze} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Analyzing...' : 'Analyze Impact'}</Text>
            </TouchableOpacity>

            {loading && (
              <View style={styles.analyzingBox}>
                {analyzingSteps.map((step, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.analyzingStep,
                      i < analyzeStep && styles.analyzingStepDone,
                      i === analyzeStep && styles.analyzingStepActive,
                    ]}
                  >
                    {i < analyzeStep ? '✓ ' : ''}{step}
                  </Text>
                ))}
              </View>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            {analysis && (
              <View>
                {/* Executive Summary */}
                <View style={styles.card}>
                  {analysis.event_classification && (
                    <View style={styles.classRow}>
                      <Text style={styles.classBadge}>{analysis.event_classification.type}</Text>
                      <Text style={[styles.classBadge, { borderColor: getRiskColor(analysis.event_classification.severity) }]}>
                        Severity: {analysis.event_classification.severity}
                      </Text>
                      <Text style={styles.classBadge}>India: {analysis.event_classification.india_exposure}</Text>
                    </View>
                  )}
                  <Text style={styles.cardTitle}>Market Intelligence Report</Text>
                  <Text style={styles.cardText}>{analysis.executive_summary || analysis.summary}</Text>
                </View>

                {/* Overall Market Impact */}
                {analysis.overall_market_impact && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Overall Market Impact</Text>
                    <View style={styles.probLabelRow}>
                      <Text style={styles.probLabelText}>Direction: {analysis.overall_market_impact.direction}</Text>
                      <Text style={styles.probLabelText}>{analysis.overall_market_impact.probability}%</Text>
                    </View>
                    <View style={styles.probBarBg}>
                      <View style={[styles.probBarFill, {
                        width: `${analysis.overall_market_impact.probability || 0}%`,
                        backgroundColor: getColor(analysis.overall_market_impact.direction)
                      }]} />
                    </View>

                    <View style={styles.riskRow}>
                      <View style={[styles.riskDot, { backgroundColor: getRiskColor(analysis.overall_market_impact.risk_level) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitleSmall}>Risk Level: {analysis.overall_market_impact.risk_level}</Text>
                        <Text style={styles.cardText}>{analysis.overall_market_impact.risk_explanation}</Text>
                      </View>
                    </View>

                    {analysis.overall_market_impact.nifty_impact && (
                      <>
                        <Text style={styles.sectionLabel}>Nifty 50 Forecast</Text>
                        <View style={styles.gridWrap}>
                          {Object.entries(analysis.overall_market_impact.nifty_impact).map(([k, v]) => (
                            <View style={styles.gridCell} key={k}>
                              <Text style={styles.gridLabel}>{k.replace(/_/g, ' ').toUpperCase()}</Text>
                              <Text style={styles.gridValue}>{v}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {analysis.overall_market_impact.sensex_impact && (
                      <>
                        <Text style={styles.sectionLabel}>Sensex Forecast</Text>
                        <View style={styles.gridWrap}>
                          {Object.entries(analysis.overall_market_impact.sensex_impact).map(([k, v]) => (
                            <View style={styles.gridCell} key={k}>
                              <Text style={styles.gridLabel}>{k.replace(/_/g, ' ').toUpperCase()}</Text>
                              <Text style={styles.gridValue}>{v}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* Sectors */}
                <Text style={styles.sectionTitle}>Sectors Impacted</Text>
                {analysis.sectors?.map((s, i) => (
                  <View key={i} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: getColor(s.impact) }]}>
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: getColor(s.impact) }]}>
                        <Text style={styles.badgeText}>{s.impact}</Text>
                      </View>
                      {s.impact_type && (
                        <View style={[styles.badge, { backgroundColor: '#3b82f6' }]}>
                          <Text style={styles.badgeText}>{s.impact_type}</Text>
                        </View>
                      )}
                    </View>

                    {s.probability != null && (
                      <>
                        <View style={styles.probLabelRow}>
                          <Text style={styles.probLabelText}>Probability</Text>
                          <Text style={styles.probLabelText}>{s.probability}%</Text>
                        </View>
                        <View style={styles.probBarBg}>
                          <View style={[styles.probBarFill, { width: `${s.probability || 0}%`, backgroundColor: getColor(s.impact) }]} />
                        </View>
                      </>
                    )}

                    {Array.isArray(s.reasoning) ? (
                      s.reasoning.map((r, idx) => (
                        <Text key={idx} style={styles.bulletText}>• {r}</Text>
                      ))
                    ) : (
                      <Text style={styles.cardText}>{s.reasoning || s.reason}</Text>
                    )}

                    {s.timeframes && (
                      <View style={styles.gridWrap}>
                        {Object.entries(s.timeframes).map(([k, v]) => (
                          <View style={styles.timeframeCell} key={k}>
                            <Text style={styles.gridLabel}>{k.replace(/_/g, ' ')}</Text>
                            <Text style={[styles.gridValueSmall, { color: getColor(v) }]}>{v}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {s.winners?.length > 0 && (
                      <View style={styles.wlSection}>
                        <Text style={styles.wlLabel}>Beneficiaries</Text>
                        <View style={styles.wlTagsRow}>
                          {s.winners.map((w, idx) => (
                            <Text key={idx} style={[styles.wlTag, styles.wlTagWinner]}>{w}</Text>
                          ))}
                        </View>
                      </View>
                    )}

                    {s.losers?.length > 0 && (
                      <View style={styles.wlSection}>
                        <Text style={styles.wlLabel}>At Risk</Text>
                        <View style={styles.wlTagsRow}>
                          {s.losers.map((w, idx) => (
                            <Text key={idx} style={[styles.wlTag, styles.wlTagLoser]}>{w}</Text>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                {/* Commodities */}
                {analysis.commodities?.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Commodities</Text>
                    {analysis.commodities.map((c, i) => (
                      <View key={i} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: getColor(c.price_impact || c.impact) }]}>
                        <Text style={styles.cardTitle}>{c.name}</Text>
                        <View style={styles.badgeRow}>
                          <View style={[styles.badge, { backgroundColor: getColor(c.price_impact || c.impact) }]}>
                            <Text style={styles.badgeText}>Price: {c.price_impact || c.impact}</Text>
                          </View>
                          {c.india_economic_impact && (
                            <View style={[styles.badge, { backgroundColor: getColor(c.india_economic_impact) }]}>
                              <Text style={styles.badgeText}>India: {c.india_economic_impact}</Text>
                            </View>
                          )}
                        </View>
                        {c.probability != null && (
                          <View style={styles.probLabelRow}>
                            <Text style={styles.probLabelText}>Probability</Text>
                            <Text style={styles.probLabelText}>{c.probability}%</Text>
                          </View>
                        )}
                        <Text style={styles.cardText}>{c.reasoning}</Text>

                        {c.beneficiary_stocks?.length > 0 && (
                          <View style={styles.wlSection}>
                            <Text style={styles.wlLabel}>Beneficiaries</Text>
                            <View style={styles.wlTagsRow}>
                              {c.beneficiary_stocks.map((w, idx) => (
                                <Text key={idx} style={[styles.wlTag, styles.wlTagWinner]}>{w}</Text>
                              ))}
                            </View>
                          </View>
                        )}
                        {c.loser_stocks?.length > 0 && (
                          <View style={styles.wlSection}>
                            <Text style={styles.wlLabel}>At Risk</Text>
                            <View style={styles.wlTagsRow}>
                              {c.loser_stocks.map((w, idx) => (
                                <Text key={idx} style={[styles.wlTag, styles.wlTagLoser]}>{w}</Text>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}

                {/* Currency & Bonds */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>💱 Currency (USD/INR)</Text>
                  <Text style={styles.cardTitleSmall}>
                    {analysis.currency?.usd_inr}
                    {analysis.currency?.probability != null && ` (${analysis.currency.probability}%)`}
                  </Text>
                  {analysis.currency?.expected_range && (
                    <Text style={styles.cardText}>Expected Range: {analysis.currency.expected_range}</Text>
                  )}
                  <Text style={styles.cardText}>{analysis.currency?.reasoning || analysis.currency?.reason}</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📊 Bonds</Text>
                  <Text style={[styles.cardTitleSmall, { color: getColor(analysis.bonds?.impact) }]}>
                    {analysis.bonds?.impact}
                    {analysis.bonds?.probability != null && ` (${analysis.bonds.probability}%)`}
                  </Text>
                  {analysis.bonds?.yield_direction && (
                    <Text style={styles.cardText}>Yield Direction: {analysis.bonds.yield_direction}</Text>
                  )}
                  <Text style={styles.cardText}>{analysis.bonds?.reasoning || analysis.bonds?.reason}</Text>
                </View>

                {/* Historical Matches */}
                {analysis.historical_matches?.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Historical Matches</Text>
                    {analysis.historical_matches.map((h, i) => (
                      <View key={i} style={styles.card}>
                        <View style={styles.histHeaderRow}>
                          <Text style={styles.cardTitleSmall}>{h.event}</Text>
                          <View style={styles.similarityBadge}>
                            <Text style={styles.similarityText}>{h.similarity}% match</Text>
                          </View>
                        </View>
                        <View style={styles.histStatsRow}>
                          <View style={styles.histStat}>
                            <Text style={styles.gridLabel}>Initial Impact</Text>
                            <Text style={styles.gridValueSmall}>{h.initial_nifty_impact}</Text>
                          </View>
                          <View style={styles.histStat}>
                            <Text style={styles.gridLabel}>30-Day Perf</Text>
                            <Text style={styles.gridValueSmall}>{h['30_day_performance']}</Text>
                          </View>
                          <View style={styles.histStat}>
                            <Text style={styles.gridLabel}>Recovery</Text>
                            <Text style={styles.gridValueSmall}>{h.recovery_days} days</Text>
                          </View>
                        </View>
                        <Text style={styles.cardTextSmall}>
                          Best: {h.best_sectors?.join(', ')} | Worst: {h.worst_sectors?.join(', ')}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Scenario Analysis */}
                {analysis.scenario_analysis && (
                  <>
                    <Text style={styles.sectionTitle}>Scenario Analysis</Text>
                    {Object.values(analysis.scenario_analysis).map((s, i) => (
                      <View key={i} style={styles.scenarioCard}>
                        <Text style={styles.cardTitle}>{s.name}</Text>
                        <Text style={styles.scenarioProb}>{s.probability}%</Text>
                        <Text style={styles.cardTextSmall}>Nifty: {s.nifty_impact}</Text>
                        <Text style={styles.cardText}>{s.description}</Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Winners / Losers */}
                {analysis.winners_losers && (
                  <>
                    <Text style={styles.sectionTitle}>Likely Winners & Losers</Text>
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>🏆 Top Winners</Text>
                      {analysis.winners_losers.top_winners?.map((w, i) => (
                        <View key={i} style={{ marginTop: 8 }}>
                          <View style={styles.wlTagsRow}>
                            <Text style={[styles.wlTag, styles.wlTagWinner]}>{w.stock}</Text>
                            <Text style={styles.cardTextSmall}>{w.sector}</Text>
                          </View>
                          <Text style={styles.cardText}>{w.reason}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.card}>
                      <Text style={styles.cardTitle}>⚠️ Top Losers</Text>
                      {analysis.winners_losers.top_losers?.map((w, i) => (
                        <View key={i} style={{ marginTop: 8 }}>
                          <View style={styles.wlTagsRow}>
                            <Text style={[styles.wlTag, styles.wlTagLoser]}>{w.stock}</Text>
                            <Text style={styles.cardTextSmall}>{w.sector}</Text>
                          </View>
                          <Text style={styles.cardText}>{w.reason}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Investment Thesis */}
                {analysis.investment_thesis && (
                  <View style={[styles.card, styles.thesisCard]}>
                    <Text style={styles.cardTitle}>📋 Market Intelligence Summary</Text>
                    <Text style={styles.cardText}>{analysis.investment_thesis}</Text>
                  </View>
                )}

                {/* Key Risks */}
                {analysis.key_risks?.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>⚠️ Key Risks</Text>
                    {analysis.key_risks.map((r, i) => (
                      <View key={i} style={styles.riskTag}>
                        <Text style={styles.cardTextSmall}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Historical Precedent (old fallback) */}
                {analysis.historical_precedent && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>📜 Historical Precedent</Text>
                    <Text style={styles.cardText}>{analysis.historical_precedent}</Text>
                  </View>
                )}

                {/* Methodology */}
                {(analysis.reasoning_trace || analysis.news_factors_considered) && (
                  <>
                    <TouchableOpacity style={styles.traceToggle} onPress={() => setShowTrace(!showTrace)}>
                      <Text style={styles.traceToggleText}>{showTrace ? 'Hide' : 'Show'} Analysis Methodology</Text>
                    </TouchableOpacity>
                    {showTrace && (
                      <View style={styles.card}>
                        {analysis.reasoning_trace?.event_type_identified && (
                          <Text style={styles.cardTextSmall}>Event Type: {analysis.reasoning_trace.event_type_identified}</Text>
                        )}
                        {analysis.reasoning_trace?.historical_events_matched?.length > 0 && (
                          <Text style={styles.cardTextSmall}>Historical Matches: {analysis.reasoning_trace.historical_events_matched.join(', ')}</Text>
                        )}
                        {analysis.reasoning_trace?.sentiment && (
                          <Text style={styles.cardTextSmall}>Sentiment: {analysis.reasoning_trace.sentiment}</Text>
                        )}
                        {analysis.reasoning_trace?.market_sensitivity && (
                          <Text style={styles.cardTextSmall}>Market Sensitivity: {analysis.reasoning_trace.market_sensitivity}</Text>
                        )}
                        {analysis.reasoning_trace?.overall_confidence != null && (
                          <Text style={styles.cardTextSmall}>Overall Confidence: {analysis.reasoning_trace.overall_confidence}%</Text>
                        )}
                        {analysis.news_factors_considered?.length > 0 && (
                          <Text style={styles.cardTextSmall}>Factors Considered: {analysis.news_factors_considered.join(', ')}</Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <View>
            <Text style={styles.sectionTitle}>Past Analyses</Text>
            {history.length === 0 && <Text style={styles.cardText}>No analyses yet.</Text>}
            {history.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.card}
                onPress={() => {
                  setResult({ analysis: item.full_analysis, event: item.event_description });
                  setActiveTab('analyze');
                  setShowTrace(false);
                }}
              >
                <Text style={styles.cardText}>{item.event_description}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: getColor(item.overall_impact) }]}>
                    <Text style={styles.badgeText}>{item.overall_impact}</Text>
                  </View>
                </View>
                <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'news' && (
          <View>
            <Text style={styles.sectionTitle}>Latest Business News</Text>
            {news.length === 0 && <Text style={styles.cardText}>Loading...</Text>}
            {news.map((item, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText}>{item.description}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                  <Text style={styles.link}>Read more →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  profileBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  profileEmail: { color: '#94a3b8', fontSize: 12 },
  logoutText: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e2e8f0', textAlign: 'center', marginTop: 10 },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginBottom: 16 },
  tabs: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 8 },
  tab: { backgroundColor: '#1e293b', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { color: '#94a3b8', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  button: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  error: { color: '#fecaca', backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginTop: 12 },

  analyzingBox: { padding: 20, alignItems: 'center' },
  analyzingStep: { color: '#94a3b8', fontSize: 13, marginVertical: 4, opacity: 0.5 },
  analyzingStepActive: { color: '#3b82f6', opacity: 1, fontWeight: '600' },
  analyzingStepDone: { color: '#22c55e', opacity: 1 },

  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginTop: 12 },
  cardTitle: { color: '#e2e8f0', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  cardTitleSmall: { color: '#e2e8f0', fontWeight: '600', fontSize: 13, marginTop: 4 },
  cardText: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  cardTextSmall: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  bulletText: { color: '#cbd5e1', fontSize: 13, marginTop: 4, marginLeft: 4 },
  sectionTitle: { color: '#e2e8f0', fontSize: 17, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  sectionLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 4 },

  classRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  classBadge: {
    borderWidth: 1, borderColor: '#334155', color: '#cbd5e1',
    fontSize: 11, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12,
  },

  probLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  probLabelText: { color: '#94a3b8', fontSize: 12 },
  probBarBg: { backgroundColor: '#0f172a', borderRadius: 8, height: 8, marginTop: 4, overflow: 'hidden' },
  probBarFill: { height: '100%', borderRadius: 8 },

  riskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  riskDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },

  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  gridCell: { backgroundColor: '#0f172a', borderRadius: 8, padding: 8, width: '47%', alignItems: 'center' },
  gridLabel: { color: '#64748b', fontSize: 9, textAlign: 'center' },
  gridValue: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  gridValueSmall: { color: '#e2e8f0', fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  timeframeCell: { backgroundColor: '#0f172a', borderRadius: 6, padding: 6, width: '23%', alignItems: 'center' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  wlSection: { marginTop: 10 },
  wlLabel: { color: '#64748b', fontSize: 11, marginBottom: 4 },
  wlTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  wlTag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  wlTagWinner: { backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  wlTagLoser: { backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },

  histHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  similarityBadge: { backgroundColor: '#3b82f6', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  similarityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  histStatsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  histStat: { flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 6, alignItems: 'center' },

  scenarioCard: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14, marginTop: 10, borderTopWidth: 3, borderTopColor: '#3b82f6' },
  scenarioProb: { color: '#3b82f6', fontSize: 22, fontWeight: 'bold', marginVertical: 4 },

  thesisCard: { borderLeftWidth: 4, borderLeftColor: '#3b82f6' },

  riskTag: { backgroundColor: '#0f172a', borderLeftWidth: 3, borderLeftColor: '#f59e0b', padding: 8, borderRadius: 6, marginTop: 6 },

  traceToggle: { borderWidth: 1, borderColor: '#334155', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  traceToggleText: { color: '#94a3b8', fontSize: 13 },

  dateText: { color: '#64748b', fontSize: 11, marginTop: 6 },
  link: { color: '#3b82f6', marginTop: 6, fontSize: 13 },
});