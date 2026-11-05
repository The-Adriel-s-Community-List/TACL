const SUPABASE_URL = 'https://lvsadkjtahlwtxapqbjf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FPXDZuz4AsAGAhgtqRDPAQ__hR5Mw-r';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
