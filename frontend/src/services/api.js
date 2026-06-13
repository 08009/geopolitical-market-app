import axios from 'axios';
import { supabase } from './supabaseClient';

const API_URL = 'https://geopolitical-market-backend.onrender.com/api';

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

export const analyzeEvent = async (event) => {
  const user_id = await getUserId();
  const response = await axios.post(`${API_URL}/analyze`, { event, user_id });
  return response.data;
};

export const getHistory = async () => {
  const user_id = await getUserId();
  const response = await axios.get(`${API_URL}/analyze/history`, { params: { user_id } });
  return response.data;
};

export const getLatestNews = async () => {
  const response = await axios.get(`${API_URL}/analyze/news`);
  return response.data;
};