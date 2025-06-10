import { type NextRequest, NextResponse } from "next/server"

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

let accessToken: string | null = null
let tokenExpiry = 0

async function getSpotifyAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error("Failed to get Spotify access token")
  }

  const data = await response.json()
  accessToken = data.access_token
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000 // Refresh 1 minute early

  return accessToken
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query || query.length < 2) {
      return NextResponse.json({ tracks: [] })
    }

    const token = await getSpotifyAccessToken()

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error("Spotify API request failed")
    }

    const data = await response.json()

    const tracks = data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      album: track.album.name,
      image: track.album.images[2]?.url || track.album.images[0]?.url,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
    }))

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error("Spotify search error:", error)
    return NextResponse.json({ tracks: [], error: "Search failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { trackId } = await request.json()

    if (!trackId) {
      return NextResponse.json({ error: "Track ID is required" }, { status: 400 })
    }

    const token = await getSpotifyAccessToken()

    // Start with basic track info
    const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!trackResponse.ok) {
      console.error(`Track fetch failed: ${trackResponse.status} ${trackResponse.statusText}`)
      return NextResponse.json({ error: "Failed to fetch track details" }, { status: trackResponse.status })
    }

    const track = await trackResponse.json()

    // Initialize the detailed track object with basic info
    const detailedTrack: any = {
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      album: track.album.name,
      image: track.album.images[2]?.url || track.album.images[0]?.url,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
      popularity: track.popularity,
      duration_ms: track.duration_ms,
      genres: [],
      audio_features: null,
    }

    // Try to get audio features (optional)
    try {
      const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (featuresResponse.ok) {
        const features = await featuresResponse.json()
        if (features && features.danceability !== undefined) {
          detailedTrack.audio_features = {
            danceability: features.danceability || 0,
            energy: features.energy || 0,
            valence: features.valence || 0,
            tempo: Math.round(features.tempo) || 120,
            key: features.key || 0,
            mode: features.mode || 1,
            time_signature: features.time_signature || 4,
            acousticness: features.acousticness || 0,
            instrumentalness: features.instrumentalness || 0,
            speechiness: features.speechiness || 0,
          }
        }
      }
    } catch (featuresError) {
      console.warn("Failed to fetch audio features:", featuresError)
    }

    // Try to get artist genres (optional)
    try {
      if (track.artists && track.artists[0] && track.artists[0].id) {
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${track.artists[0].id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (artistResponse.ok) {
          const artist = await artistResponse.json()
          if (artist && artist.genres) {
            detailedTrack.genres = artist.genres.slice(0, 5) // Limit to 5 genres
          }
        }
      }
    } catch (artistError) {
      console.warn("Failed to fetch artist details:", artistError)
    }

    return NextResponse.json({ track: detailedTrack })
  } catch (error) {
    console.error("Spotify track details error:", error)
    return NextResponse.json({ error: "Failed to fetch track details" }, { status: 500 })
  }
}
