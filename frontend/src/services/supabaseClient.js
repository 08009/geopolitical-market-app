import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anekvdqjtagxnubnngad.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZWt2ZHFqdGFneG51Ym5uZ2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzUyOTUsImV4cCI6MjA5Njc1MTI5NX0.DORqfEki2q5gZ5SSRx1tCv_Z4KrGi8LrW4J1IENgxB4';

export const supabase = createClient(supabaseUrl, supabaseKey);