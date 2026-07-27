import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bkvxzsxgwqcztkgxrfcp.supabase.co";

const supabaseKey =
  "sb_publishable_bkcSlYmEqO-_twwZzCqpGA_oagnye44";

export const supabase = createClient(supabaseUrl, supabaseKey);