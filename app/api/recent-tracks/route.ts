import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

// Ensure we have a Supabase admin client for server-side operations
const getSupabaseAdmin = () => {
  // If the supabaseAdmin is already initialized, use it
  if (supabaseAdmin) return supabaseAdmin

  // Otherwise, create a new client for this request
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "3")

    try {
      const supabase = getSupabaseAdmin()
      // Query the database for recent completed tracks
      const { data: tracks, error } = await supabase
        .from("tracks")
        .select("id, title, duration, status, created_at, file_url")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Error fetching recent tracks:", error)
        return NextResponse.json({ error: "Failed to fetch recent tracks" }, { status: 500 })
      }

      return NextResponse.json({ tracks: tracks || [] })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
  } catch (error) {
    console.error("Recent tracks error:", error)
    return NextResponse.json({ error: "Failed to fetch recent tracks" }, { status: 500 })
  }
}
