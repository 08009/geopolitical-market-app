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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.profileBar}>
          <Text style={styles.profileEmail}>👤 {user.email}</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>🌍 Geopolitical Market Analyzer</Text>
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

            {loading && <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />}
            {error && <Text style={styles.error}>{error}</Text>}

            {result && (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Summary</Text>
                  <Text style={styles.cardText}>{result.analysis.summary}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: getColor(result.analysis.overall_market_impact) }]}>
                      <Text style={styles.badgeText}>{result.analysis.overall_market_impact}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#3b82f6' }]}>
                      <Text style={styles.badgeText}>{result.analysis.confidence_level}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Sectors Impacted</Text>
                {result.analysis.sectors?.map((s, i) => (
                  <View key={i} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: getColor(s.impact) }]}>
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    <Text style={{ color: getColor(s.impact), fontWeight: 'bold', fontSize: 12 }}>
                      {s.impact} ({s.magnitude})
                    </Text>
                    <Text style={styles.cardText}>{s.reason}</Text>
                    <Text style={styles.stocksText}>{s.stocks?.join(', ')}</Text>
                  </View>
                ))}

                {result.analysis.commodities?.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Commodities</Text>
                    {result.analysis.commodities.map((c, i) => (
                      <View key={i} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: getColor(c.impact) }]}>
                        <Text style={styles.cardTitle}>{c.name}</Text>
                        <Text style={{ color: getColor(c.impact), fontWeight: 'bold', fontSize: 12 }}>
                          {c.impact} ({c.magnitude})
                        </Text>
                        <Text style={styles.cardText}>{c.reason}</Text>
                      </View>
                    ))}
                  </>
                )}

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>💱 Currency (USD/INR)</Text>
                  <Text style={styles.cardText}>{result.analysis.currency?.usd_inr}</Text>
                  <Text style={styles.cardText}>{result.analysis.currency?.reason}</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📊 Bonds</Text>
                  <Text style={{ color: getColor(result.analysis.bonds?.impact), fontWeight: 'bold' }}>
                    {result.analysis.bonds?.impact}
                  </Text>
                  <Text style={styles.cardText}>{result.analysis.bonds?.reason}</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📜 Historical Precedent</Text>
                  <Text style={styles.cardText}>{result.analysis.historical_precedent}</Text>
                </View>
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
  title: { fontSize: 22, fontWeight: 'bold', color: '#e2e8f0', textAlign: 'center', marginTop: 10 },
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
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginTop: 12 },
  cardTitle: { color: '#e2e8f0', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  cardText: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  sectionTitle: { color: '#e2e8f0', fontSize: 17, fontWeight: 'bold', marginTop: 20, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  stocksText: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
  dateText: { color: '#64748b', fontSize: 11, marginTop: 6 },
  link: { color: '#3b82f6', marginTop: 6, fontSize: 13 },
});