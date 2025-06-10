import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "3")

    // Check if we have Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials found, using placeholder data")

      // Generate some realistic placeholder data
      const placeholderTracks = [
        {
          id: "1",
          title: "Dreamy Midnight Piano",
          duration: 154,
          status: "completed",
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          file_url: "https://fake-storage.com/music/1.mp3",
        },
        {
          id: "2",
          title: "Nostalgic Evening Jazz",
          duration: 201,
          status: "completed",
          created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          file_url: "https://fake-storage.com/music/2.mp3",
        },
        {
          id: "3",
          title: "Serene Ocean Vibes",
          duration: 252,
          status: "completed",
          created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
          file_url: "https://fake-storage.com/music/3.mp3",
        },
      ]

      return NextResponse.json({ tracks: placeholderTracks.slice(0, limit) })
    }

    // Query the database for recent completed tracks
    const { data: tracks, error } = await supabaseAdmin
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
  } catch (error) {
    console.error("Recent tracks error:", error)
    return NextResponse.json({ error: "Failed to fetch recent tracks" }, { status: 500 })
  }
}
