import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("jobs").select("id").limit(1);
    return NextResponse.json({
      ok: !error,
      supabase: error ? `error: ${error.message}` : "reachable",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        supabase: error instanceof Error ? error.message : "unknown error",
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
