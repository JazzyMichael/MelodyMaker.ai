import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "3")

    // Query the database for recent completed tracks
    const { data: tracks, error } = await supabaseAdmin
      .from("tracks")
      .select("id, title, duration, status, created_at, file_url")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching recent tracks:", error)
      return NextResponse.json(
        { error: "Failed to fetch recent tracks" },
        { status: 500 }
      )
    }

    return NextResponse.json({ tracks: tracks || [] })
  } catch (error) {
    console.error("Recent tracks error:", error)
    return NextResponse.json(
      { error: "Failed to fetch recent tracks" },
      { status: 500 }
    )
  }
}
