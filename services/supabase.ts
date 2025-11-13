import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lonnpgpgflzrmwkhacui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvbm5wZ3BnZmx6cm13a2hhY3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTIzMTQsImV4cCI6MjA3ODU4ODMxNH0.zJbnMVdMGpTuEqAx-4CWhgRYkchi29MVhOhPhSs5Gmc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
