import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request, { params }) {
  try {
    const { clientId } = await params;
    const supabase = createSupabaseAdmin();
    const { data: products } = await supabase
      .from("products")
      .select("id, nombre, customization_options")
      .eq("tenant_id", clientId);
      
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
