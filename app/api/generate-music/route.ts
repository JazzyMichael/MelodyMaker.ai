import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import Replicate from "replicate"

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

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
})

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
  times: [
    "Midnight",
    "Dawn",
    "Sunset",
    "Evening",
    "Morning",
    "Twilight",
    "Afternoon",
    "Night",
  ],
  places: [
    "City",
    "Ocean",
    "Forest",
    "Garden",
    "Studio",
    "Cafe",
    "Rooftop",
    "Valley",
    "Beach",
    "Mountain",
  ],
  activities: [
    "Dreams",
    "Memories",
    "Journey",
    "Dance",
    "Meditation",
    "Study",
    "Vibes",
    "Session",
    "Flow",
    "Escape",
  ],
  instruments: [
    "Piano",
    "Guitar",
    "Synth",
    "Drums",
    "Bass",
    "Strings",
    "Vocals",
    "Beats",
  ],
  genres: [
    "Lofi",
    "Ambient",
    "Jazz",
    "Electronic",
    "Acoustic",
    "Chill",
    "Indie",
    "Neo-Soul",
    "Downtempo",
  ],
  descriptors: [
    "Smooth",
    "Deep",
    "Soft",
    "Warm",
    "Cool",
    "Rich",
    "Light",
    "Heavy",
    "Bright",
    "Dark",
  ],
  weather: ["Rainy", "Sunny", "Cloudy", "Stormy", "Misty", "Windy"],
  emotions: [
    "Hopeful",
    "Reflective",
    "Joyful",
    "Contemplative",
    "Energetic",
    "Calm",
    "Intense",
    "Gentle",
  ],
}

// Function to generate a random title based on track data
function generateRandomTitle(
  description: string,
  selectedSongs: SelectedSong[]
): string {
  const titleLength = Math.floor(Math.random() * 7) + 2 // 2-8 words
  const usedWords = new Set<string>()
  const titleParts: string[] = []

  // Helper function to get a random word from a category
  const getRandomWord = (category: string[]) => {
    const availableWords = category.filter(
      (word) => !usedWords.has(word.toLowerCase())
    )
    if (availableWords.length === 0)
      return category[Math.floor(Math.random() * category.length)]
    const word =
      availableWords[Math.floor(Math.random() * availableWords.length)]
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
    ].includes(word)
  )

  // Analyze selected songs for inspiration
  let avgEnergy = 0.5
  let avgValence = 0.5
  let commonGenres: string[] = []
  let avgTempo = 120

  if (selectedSongs.length > 0) {
    avgEnergy =
      selectedSongs.reduce(
        (sum, song) => sum + (song.audio_features?.energy || 0.5),
        0
      ) / selectedSongs.length
    avgValence =
      selectedSongs.reduce(
        (sum, song) => sum + (song.audio_features?.valence || 0.5),
        0
      ) / selectedSongs.length
    avgTempo =
      selectedSongs.reduce(
        (sum, song) => sum + (song.audio_features?.tempo || 120),
        0
      ) / selectedSongs.length
    commonGenres = [
      ...new Set(selectedSongs.flatMap((song) => song.genres || [])),
    ]
  }

  // Build title based on characteristics
  for (let i = 0; i < titleLength; i++) {
    let word = ""

    if (i === 0) {
      // First word - often a mood or descriptor
      if (avgValence > 0.7) {
        word = getRandomWord([
          ...titleWords.moods.filter((m) =>
            ["Euphoric", "Vibrant", "Joyful", "Energetic"].includes(m)
          ),
          ...titleWords.emotions.filter((e) =>
            ["Hopeful", "Joyful", "Energetic"].includes(e)
          ),
        ])
      } else if (avgValence < 0.3) {
        word = getRandomWord([
          ...titleWords.moods.filter((m) =>
            ["Melancholic", "Nostalgic", "Reflective"].includes(m)
          ),
          ...titleWords.emotions.filter((e) =>
            ["Reflective", "Contemplative"].includes(e)
          ),
        ])
      } else {
        word = getRandomWord([...titleWords.moods, ...titleWords.descriptors])
      }
    } else if (i === titleLength - 1) {
      // Last word - often an activity or place
      const categories = [titleWords.activities, titleWords.places]
      if (avgEnergy > 0.6) {
        categories.push(
          titleWords.activities.filter((a) =>
            ["Dance", "Flow", "Session"].includes(a)
          )
        )
      }
      word = getRandomWord(
        categories[Math.floor(Math.random() * categories.length)]
      )
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
            (g) =>
              g.toLowerCase().includes(genre.toLowerCase()) ||
              genre.toLowerCase().includes(g.toLowerCase())
          )
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

      const selectedCategory =
        allCategories[Math.floor(Math.random() * allCategories.length)]
      word = getRandomWord(selectedCategory)
    }

    titleParts.push(word)
  }

  return titleParts.join(" ")
}

// Function to generate music with Replicate using webhooks
async function generateMusicWithReplicate(
  prompt: string,
  trackId: string,
  duration = 10
) {
  try {
    console.log("Starting music generation with prompt:", prompt)

    // Construct webhook URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://melodymakerai.vercel.app"
    // : "http://localhost:3000";

    const webhookUrl = `${baseUrl}/api/webhooks/replicate`

    console.log("Using webhook URL:", webhookUrl)

    // Create prediction with webhook
    const prediction = await replicate.predictions.create({
      version:
        "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      input: {
        prompt: prompt,
        model_version: "stereo-large",
        output_format: "mp3",
        normalization_strategy: "peak",
        top_k: 250,
        top_p: 0.0,
        temperature: 1.0,
        classifier_free_guidance: 3.0,
        duration: duration,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["start", "output", "logs", "completed"],
    })

    console.log("Prediction created:", prediction.id)

    return {
      predictionId: prediction.id,
      status: prediction.status,
      webhookUrl: webhookUrl,
    }
  } catch (error) {
    console.error("Error generating music with Replicate:", error)

    // Improved error handling for various error types
    let errorMessage = "Failed to generate music"

    if (error instanceof Error) {
      // Extract the most useful part of the error message
      errorMessage = error.message

      // Handle specific Replicate errors with better messages
      if (error.message.includes("Invalid version")) {
        errorMessage =
          "The MusicGen model version is not available. Please try again later."
      } else if (error.message.includes("rate limit")) {
        errorMessage =
          "Rate limit exceeded. Please wait a moment before trying again."
      } else if (error.message.includes("insufficient credits")) {
        errorMessage =
          "Insufficient Replicate credits. Please check your account."
      } else if (error.message.includes("An error occurred")) {
        errorMessage = "Replicate service error. Please try again later."
      }
    }

    throw new Error(errorMessage)
  }
}

// Function to create a track record in Supabase
async function createTrackRecord(data: any) {
  try {
    const { data: track, error } = await supabaseAdmin
      .from("tracks")
      .insert([data])
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    console.log("Track record created:", track.id)
    return track
  } catch (error) {
    console.error("Error creating track record:", error)
    throw error
  }
}

// Function to update a track record in Supabase
async function updateTrackRecord(id: string, updates: any) {
  try {
    const { data, error } = await supabaseAdmin
      .from("tracks")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    console.log("Track record updated:", id, updates.status)
    return data
  } catch (error) {
    console.error("Error updating track record:", error)
    throw error
  }
}

// Helper function to analyze selected songs and create generation prompt
function createGenerationPrompt(
  description: string,
  selectedSongs: SelectedSong[]
) {
  let prompt = description

  if (selectedSongs.length > 0) {
    // Extract common characteristics from selected songs
    const genres = [
      ...new Set(selectedSongs.flatMap((song) => song.genres || [])),
    ]
    const avgTempo =
      selectedSongs.reduce(
        (sum, song) => sum + (song.audio_features?.tempo || 120),
        0
      ) / selectedSongs.length
    const avgEnergy =
      selectedSongs.reduce(
        (sum, song) => sum + (song.audio_features?.energy || 0.5),
        0
      ) / selectedSongs.length
    const avgValence =
      selectedSongs.reduce(
        (sum, song) => sum + (song.audio_features?.valence || 0.5),
        0
      ) / selectedSongs.length

    // Enhance the prompt with musical characteristics
    if (genres.length > 0) {
      prompt += ` Incorporate elements from ${genres
        .slice(0, 3)
        .join(", ")} genres.`
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

// POST endpoint to generate a new track
export async function POST(request: NextRequest) {
  try {
    const body: GenerateMusicRequest = await request.json()
    const { description, selectedSongs } = body

    // Validate input
    if (!description.trim() && selectedSongs.length === 0) {
      return NextResponse.json(
        { error: "Either description or selected songs must be provided" },
        { status: 400 }
      )
    }

    // Generate a random title based on the supplied data
    const title = generateRandomTitle(description, selectedSongs)

    // Create generation prompt
    const generationPrompt = createGenerationPrompt(description, selectedSongs)
    console.log("Generated prompt:", generationPrompt)

    // Extract metadata from selected songs
    const allGenres = [
      ...new Set(selectedSongs.flatMap((song) => song.genres || [])),
    ]
    const avgTempo =
      selectedSongs.length > 0
        ? Math.round(
            selectedSongs.reduce(
              (sum, song) => sum + (song.audio_features?.tempo || 120),
              0
            ) / selectedSongs.length
          )
        : 120
    const avgEnergy =
      selectedSongs.length > 0
        ? selectedSongs.reduce(
            (sum, song) => sum + (song.audio_features?.energy || 0.5),
            0
          ) / selectedSongs.length
        : 0.5
    const avgValence =
      selectedSongs.length > 0
        ? selectedSongs.reduce(
            (sum, song) => sum + (song.audio_features?.valence || 0.5),
            0
          ) / selectedSongs.length
        : 0.5

    // Create initial track record
    const trackData = {
      title: title,
      description,
      user_description: description,
      selected_songs: selectedSongs,
      generation_params: {
        prompt: generationPrompt,
        duration: 10, // 10 seconds for faster generation
        model: "musicgen",
      },
      genres: allGenres.slice(0, 5), // Limit to 5 genres
      tempo: avgTempo,
      energy: Math.round(avgEnergy * 100) / 100,
      valence: Math.round(avgValence * 100) / 100,
      status: "generating",
    }

    const track = await createTrackRecord(trackData)

    // Start music generation with webhook
    try {
      const replicateResult = await generateMusicWithReplicate(
        generationPrompt,
        track.id,
        10
      )

      // Update track record with Replicate prediction ID
      await updateTrackRecord(track.id, {
        replicate_prediction_id: replicateResult.predictionId,
      })

      console.log(
        "Generation started for track:",
        track.id,
        "with prediction:",
        replicateResult.predictionId
      )
    } catch (replicateError) {
      console.error("Failed to start generation:", replicateError)

      // Update track record with failure
      await updateTrackRecord(track.id, {
        status: "failed",
        error_message:
          replicateError instanceof Error
            ? replicateError.message
            : "Failed to start generation",
      })
    }

    // Return the track immediately (generation continues via webhook)
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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate music",
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get("id")

    if (!trackId) {
      return NextResponse.json(
        { error: "Track ID is required" },
        { status: 400 }
      )
    }

    // Query the database for the track
    const { data: track, error } = await supabaseAdmin
      .from("tracks")
      .select("*")
      .eq("id", trackId)
      .single()

    if (error) {
      console.error("Error fetching track:", error)
      return NextResponse.json(
        { error: "Failed to fetch track" },
        { status: 500 }
      )
    }

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 })
    }

    return NextResponse.json({ track })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to check status",
      },
      { status: 500 }
    )
  }
}
