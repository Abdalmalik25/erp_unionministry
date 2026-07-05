// Supabase Configuration for the Cloud Platform
// This file provides the API configuration needed for server communication

export const apiBase = '';
export const publicAnonKey = '';

// Supabase Client Configuration (to be configured with real values)
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';