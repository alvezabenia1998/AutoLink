// Configuración central de Supabase

export const SUPABASE_URL = "https://xxqnjtndcxnzwzvxaptz.supabase.co";

export const SUPABASE_KEY = "sb_publishable_HqV0cAET6T8c8jLRpmpt-A_OoDPYdCr";

export const SUPABASE_API = `${SUPABASE_URL}/rest/v1/propuestas`;

export const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};
