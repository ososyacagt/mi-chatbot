import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id, nombre, customization_options')
    .eq('tenant_id', 'bava');
  console.log('Data:', JSON.stringify(data, null, 2));
  if (error) console.error('Error:', error);
}
run();
