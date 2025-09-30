export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  stage: import.meta.env.VITE_STAGE,
  environment: import.meta.env.VITE_ENVIROMENT || "development",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};
