import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('tenants').select('id, pos_modalidad, pos_flujo_cobro').limit(1);
  console.log('Data:', data);
  if (error) console.error('Error:', error);
}
run();
