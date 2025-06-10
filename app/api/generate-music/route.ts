import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Types for the request
interface SelectedSong {
  id: string
  name: string
  artist: string
  album: string
  genres?: string[]
  audio_features?: {
    danceability: number
    energy: number
    valence: number
    tempo: number
    key: number
    mode: number
    time_signature: number
    acousticness: number
    instrumentalness: number
    speechiness: number
  }
  popularity?: number
  duration_ms?: number
}

interface GenerateMusicRequest {
  description: string
  selectedSongs: SelectedSong[]
}

// Title generation data
const titleWords = {
  moods: [
    "Dreamy",
    "Melancholic",
    "Euphoric",
    "Serene",
    "Vibrant",
    "Nostalgic",
    "Mystical",
    "Peaceful",
    "Electric",
    "Soulful",
  ],
  times: ["Midnight", "Dawn", "Sunset", "Evening", "Morning", "Twilight", "Afternoon", "Night"],
  places: ["City", "Ocean", "Forest", "Garden", "Studio", "Cafe", "Rooftop", "Valley", "Beach", "Mountain"],
  activities: ["Dreams", "Memories", "Journey", "Dance", "Meditation", "Study", "Vibes", "Session", "Flow", "Escape"],
  instruments: ["Piano", "Guitar", "Synth", "Drums", "Bass", "Strings", "Vocals", "Beats"],
  genres: ["Lofi", "Ambient", "Jazz", "Electronic", "Acoustic", "Chill", "Indie", "Neo-Soul", "Downtempo"],
  descriptors: ["Smooth", "Deep", "Soft", "Warm", "Cool", "Rich", "Light", "Heavy", "Bright", "Dark"],
  weather: ["Rainy", "Sunny", "Cloudy", "Stormy", "Misty", "Windy"],
  emotions: ["Hopeful", "Reflective", "Joyful", "Contemplative", "Energetic", "Calm", "Intense", "Gentle"],
}

// Function to generate a random title based on track data
function generateRandomTitle(description: string, selectedSongs: SelectedSong[]): string {
  const titleLength = Math.floor(Math.random() * 7) + 2 // 2-8 words
  const usedWords = new Set<string>()
  const titleParts: string[] = []

  // Helper function to get a random word from a category
  const getRandomWord = (category: string[]) => {
    const availableWords = category.filter((word) => !usedWords.has(word.toLowerCase()))
    if (availableWords.length === 0) return category[Math.floor(Math.random() * category.length)]
    const word = availableWords[Math.floor(Math.random() * availableWords.length)]
    usedWords.add(word.toLowerCase())
    return word
  }

  // Extract keywords from description
  const descriptionWords = description
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
  const hasKeywords = descriptionWords.some((word) =>
    [
      "rain",
      "piano",
      "guitar",
      "jazz",
      "lofi",
      "chill",
      "ambient",
      "study",
      "relax",
      "night",
      "day",
      "morning",
      "evening",
    ].includes(word),
  )

  // Analyze selected songs for inspiration
  let avgEnergy = 0.5
  let avgValence = 0.5
  let commonGenres: string[] = []
  let avgTempo = 120

  if (selectedSongs.length > 0) {
    avgEnergy =
      selectedSongs.reduce((sum, song) => sum + (song.audio_features?.energy || 0.5), 0) / selectedSongs.length
    avgValence =
      selectedSongs.reduce((sum, song) => sum + (song.audio_features?.valence || 0.5), 0) / selectedSongs.length
    avgTempo = selectedSongs.reduce((sum, song) => sum + (song.audio_features?.tempo || 120), 0) / selectedSongs.length
    commonGenres = [...new Set(selectedSongs.flatMap((song) => song.genres || []))]
  }

  // Build title based on characteristics
  for (let i = 0; i < titleLength; i++) {
    let word = ""

    if (i === 0) {
      // First word - often a mood or descriptor
      if (avgValence > 0.7) {
        word = getRandomWord([
          ...titleWords.moods.filter((m) => ["Euphoric", "Vibrant", "Joyful", "Energetic"].includes(m)),
          ...titleWords.emotions.filter((e) => ["Hopeful", "Joyful", "Energetic"].includes(e)),
        ])
      } else if (avgValence < 0.3) {
        word = getRandomWord([
          ...titleWords.moods.filter((m) => ["Melancholic", "Nostalgic", "Reflective"].includes(m)),
          ...titleWords.emotions.filter((e) => ["Reflective", "Contemplative"].includes(e)),
        ])
      } else {
        word = getRandomWord([...titleWords.moods, ...titleWords.descriptors])
      }
    } else if (i === titleLength - 1) {
      // Last word - often an activity or place
      const categories = [titleWords.activities, titleWords.places]
      if (avgEnergy > 0.6) {
        categories.push(titleWords.activities.filter((a) => ["Dance", "Flow", "Session"].includes(a)))
      }
      word = getRandomWord(categories[Math.floor(Math.random() * categories.length)])
    } else {
      // Middle words - mix of everything
      const allCategories = [
        titleWords.times,
        titleWords.places,
        titleWords.instruments,
        titleWords.weather,
        titleWords.descriptors,
      ]

      // Add genre-specific words if we have genre info
      if (commonGenres.length > 0) {
        const genreWords = commonGenres.filter((genre) =>
          titleWords.genres.some(
            (g) => g.toLowerCase().includes(genre.toLowerCase()) || genre.toLowerCase().includes(g.toLowerCase()),
          ),
        )
        if (genreWords.length > 0) {
          allCategories.push(genreWords)
        }
      }

      // Add tempo-based words
      if (avgTempo > 140) {
        allCategories.push(["Fast", "Quick", "Rapid", "Swift"])
      } else if (avgTempo < 80) {
        allCategories.push(["Slow", "Gentle", "Lazy", "Relaxed"])
      }

      const selectedCategory = allCategories[Math.floor(Math.random() * allCategories.length)]
      word = getRandomWord(selectedCategory)
    }

    titleParts.push(word)
  }

  return titleParts.join(" ")
}

// Placeholder function for Replicate MusicGen integration
async function generateMusicWithReplicate(prompt: string, duration = 30) {
  try {
    // Check if we have a Replicate API token
    const replicateApiToken = process.env.REPLICATE_API_TOKEN

    if (!replicateApiToken) {
      console.log("No Replicate API token found, using placeholder data")
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      return {
        id: `pred_${Math.random().toString(36).substr(2, 9)}`,
        status: "succeeded",
        output: `https://replicate.delivery/pbxt/fake-audio-${Date.now()}.mp3`,
        duration: duration,
      }
    }

    // In a real implementation with the token, we would use the Replicate API
    // const response = await fetch("https://api.replicate.com/v1/predictions", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Token ${replicateApiToken}`,
    //   },
    //   body: JSON.stringify({
    //     version: "7a76a8258b7be33e2128f773ede96dc13f13254c694d18ea2c44a9cae35198a5", // MusicGen model version
    //     input: {
    //       prompt: prompt,
    //       duration: duration,
    //     },
    //   }),
    // })
    // const prediction = await response.json()
    // return prediction

    // For now, return placeholder data
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return {
      id: `pred_${Math.random().toString(36).substr(2, 9)}`,
      status: "succeeded",
      output: `https://replicate.delivery/pbxt/fake-audio-${Date.now()}.mp3`,
      duration: duration,
    }
  } catch (error) {
    console.error("Error generating music with Replicate:", error)
    throw error
  }
}

// Function to upload audio to Supabase storage
async function uploadToSupabaseStorage(audioUrl: string, fileName: string) {
  try {
    // In a real implementation, this would:
    // 1. Download the audio file from Replicate
    // 2. Upload it to Supabase storage

    // For now, return placeholder data if we don't have Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials found, using placeholder data")
      return {
        path: `music/${fileName}`,
        publicUrl: `https://fake-supabase-storage.com/music/${fileName}`,
      }
    }

    // In a real implementation with credentials:
    // 1. Fetch the audio file from Replicate
    // const audioResponse = await fetch(audioUrl)
    // if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.status}`)
    // const audioBuffer = await audioResponse.arrayBuffer()

    // 2. Upload to Supabase storage
    // const { data, error } = await supabaseAdmin.storage
    //   .from('music')
    //   .upload(fileName, audioBuffer, {
    //     contentType: 'audio/mpeg',
    //     cacheControl: '3600',
    //   })

    // if (error) throw error

    // 3. Get the public URL
    // const { data: publicUrlData } = supabaseAdmin.storage
    //   .from('music')
    //   .getPublicUrl(fileName)

    // return {
    //   path: data.path,
    //   publicUrl: publicUrlData.publicUrl,
    // }

    // For now, return placeholder data
    return {
      path: `music/${fileName}`,
      publicUrl: `https://fake-supabase-storage.com/music/${fileName}`,
    }
  } catch (error) {
    console.error("Error uploading to Supabase storage:", error)
    throw error
  }
}

// Function to create a track record in Supabase
async function createTrackRecord(data: any) {
  try {
    // Check if we have Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials found, using placeholder data")
      const trackId = `track_${Math.random().toString(36).substr(2, 9)}`
      return {
        id: trackId,
        ...data,
        created_at: new Date().toISOString(),
      }
    }

    // Insert the track record into the database
    const { data: track, error } = await supabaseAdmin.from("tracks").insert([data]).select().single()

    if (error) {
      console.error("Error creating track record:", error)
      throw error
    }

    return track
  } catch (error) {
    console.error("Error creating track record:", error)
    throw error
  }
}

// Function to update a track record in Supabase
async function updateTrackRecord(id: string, updates: any) {
  try {
    // Check if we have Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials found, using placeholder data")
      return { id, ...updates }
    }

    // Update the track record in the database
    const { data, error } = await supabaseAdmin.from("tracks").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("Error updating track record:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error updating track record:", error)
    throw error
  }
}

// Function to get recent tracks
async function getRecentTracks(limit = 3) {
  try {
    // Check if we have Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials found, using placeholder data")
      return [
        {
          id: "1",
          title: "Midnight Study Session",
          duration: 154,
          status: "completed",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "2",
          title: "Rainy Day Vibes",
          duration: 201,
          status: "completed",
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: "3",
          title: "Coffee Shop Ambience",
          duration: 252,
          status: "completed",
          created_at: new Date(Date.now() - 259200000).toISOString(),
        },
      ]
    }

    // Query the database for recent tracks
    const { data: tracks, error } = await supabaseAdmin
      .from("tracks")
      .select("id, title, duration, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching recent tracks:", error)
      return []
    }

    return tracks || []
  } catch (error) {
    console.error("Error fetching recent tracks:", error)
    return []
  }
}

// Helper function to analyze selected songs and create generation prompt
function createGenerationPrompt(description: string, selectedSongs: SelectedSong[]) {
  let prompt = description

  if (selectedSongs.length > 0) {
    // Extract common characteristics from selected songs
    const genres = [...new Set(selectedSongs.flatMap((song) => song.genres || []))]
    const avgTempo =
      selectedSongs.reduce((sum, song) => sum + (song.audio_features?.tempo || 120), 0) / selectedSongs.length
    const avgEnergy =
      selectedSongs.reduce((sum, song) => sum + (song.audio_features?.energy || 0.5), 0) / selectedSongs.length
    const avgValence =
      selectedSongs.reduce((sum, song) => sum + (song.audio_features?.valence || 0.5), 0) / selectedSongs.length

    // Enhance the prompt with musical characteristics
    if (genres.length > 0) {
      prompt += ` Incorporate elements from ${genres.slice(0, 3).join(", ")} genres.`
    }

    prompt += ` Target tempo around ${Math.round(avgTempo)} BPM.`

    if (avgEnergy > 0.7) {
      prompt += " High energy and dynamic."
    } else if (avgEnergy < 0.3) {
      prompt += " Calm and relaxed."
    }

    if (avgValence > 0.7) {
      prompt += " Upbeat and positive mood."
    } else if (avgValence < 0.3) {
      prompt += " Melancholic and introspective."
    }
  }

  return prompt
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMusicRequest = await request.json()
    const { description, selectedSongs } = body

    if (!description.trim() && selectedSongs.length === 0) {
      return NextResponse.json({ error: "Either description or selected songs must be provided" }, { status: 400 })
    }

    // Generate a random title based on the supplied data
    const title = generateRandomTitle(description, selectedSongs)

    // Create generation prompt
    const generationPrompt = createGenerationPrompt(description, selectedSongs)

    // Extract metadata from selected songs
    const allGenres = [...new Set(selectedSongs.flatMap((song) => song.genres || []))]
    const avgTempo =
      selectedSongs.length > 0
        ? Math.round(
            selectedSongs.reduce((sum, song) => sum + (song.audio_features?.tempo || 120), 0) / selectedSongs.length,
          )
        : 120
    const avgEnergy =
      selectedSongs.length > 0
        ? selectedSongs.reduce((sum, song) => sum + (song.audio_features?.energy || 0.5), 0) / selectedSongs.length
        : 0.5
    const avgValence =
      selectedSongs.length > 0
        ? selectedSongs.reduce((sum, song) => sum + (song.audio_features?.valence || 0.5), 0) / selectedSongs.length
        : 0.5

    // Create initial track record
    const trackData = {
      title: title,
      description,
      user_description: description,
      selected_songs: selectedSongs,
      generation_params: {
        prompt: generationPrompt,
        duration: 30,
        model: "musicgen",
      },
      genres: allGenres.slice(0, 5), // Limit to 5 genres
      tempo: avgTempo,
      energy: Math.round(avgEnergy * 100) / 100,
      valence: Math.round(avgValence * 100) / 100,
      status: "generating",
    }

    const track = await createTrackRecord(trackData)

    // Start music generation (in background)
    generateMusicWithReplicate(generationPrompt, 30)
      .then(async (replicateResult) => {
        if (replicateResult.status === "succeeded") {
          // Upload to Supabase storage
          const fileName = `${track.id}_${Date.now()}.mp3`
          const storageResult = await uploadToSupabaseStorage(replicateResult.output, fileName)

          // Update track record with results
          await updateTrackRecord(track.id, {
            status: "completed",
            file_url: storageResult.publicUrl,
            file_path: storageResult.path,
            replicate_prediction_id: replicateResult.id,
            duration: replicateResult.duration,
          })
        } else {
          await updateTrackRecord(track.id, {
            status: "failed",
          })
        }
      })
      .catch(async (error) => {
        console.error("Music generation failed:", error)
        await updateTrackRecord(track.id, {
          status: "failed",
        })
      })

    // Return the track immediately (while generation continues in background)
    return NextResponse.json({
      success: true,
      track: {
        id: track.id,
        title: track.title,
        status: "generating",
        estimated_completion: new Date(Date.now() + 60000).toISOString(), // 1 minute estimate
        created_at: track.created_at,
      },
    })
  } catch (error) {
    console.error("Music generation error:", error)
    return NextResponse.json({ error: "Failed to generate music" }, { status: 500 })
  }
}

// GET endpoint to check generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get("id")

    if (!trackId) {
      return NextResponse.json({ error: "Track ID is required" }, { status: 400 })
    }

    // Check if we have Supabase credentials
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("No Supabase credentials found, using placeholder data")
      // Return placeholder status
      const track = {
        id: trackId,
        title: "Generated Track",
        status: Math.random() > 0.5 ? "completed" : "generating",
        file_url: `https://fake-storage.com/music/${trackId}.mp3`,
        duration: 30,
        created_at: new Date().toISOString(),
      }
      return NextResponse.json({ track })
    }

    // Query the database for the track
    const { data: track, error } = await supabaseAdmin.from("tracks").select("*").eq("id", trackId).single()

    if (error) {
      console.error("Error fetching track:", error)
      return NextResponse.json({ error: "Failed to fetch track" }, { status: 500 })
    }

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 })
    }

    return NextResponse.json({ track })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
