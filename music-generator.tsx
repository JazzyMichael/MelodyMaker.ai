"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Loader2, ExternalLink, X, Music2, Zap, HeartIcon, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Music, Play, Download, Heart, Headphones } from "lucide-react"

interface AudioFeatures {
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

interface SpotifyTrack {
  id: string
  name: string
  artist: string
  album: string
  image?: string
  preview_url?: string
  external_url: string
  genres?: string[]
  audio_features?: AudioFeatures
  popularity?: number
  duration_ms?: number
}

interface SpotifySearchResult {
  tracks: SpotifyTrack[]
  error?: string
}

interface GeneratedTrack {
  id: string
  title: string
  status: "generating" | "completed" | "failed"
  file_url?: string
  duration?: number
  created_at: string
  estimated_completion?: string
}

function useSpotifySearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchSpotify = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
      const data: SpotifySearchResult = await response.json()

      if (data.error) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.tracks)
      }
    } catch (err) {
      setError("Failed to search tracks")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSpotify(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, searchSpotify])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearResults: () => setResults([]),
  }
}

// Helper functions for audio features
const getKeyName = (key: number, mode: number) => {
  const keys = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"]
  const keyName = keys[key] || "?"
  const modeName = mode === 1 ? "Major" : "Minor"
  return `${keyName} ${modeName}`
}

const getFeatureLabel = (feature: string, value: number) => {
  const labels: Record<string, string[]> = {
    energy: ["Calm", "Relaxed", "Moderate", "Energetic", "High Energy"],
    danceability: ["Not Danceable", "Low", "Moderate", "Danceable", "Very Danceable"],
    valence: ["Sad", "Melancholic", "Neutral", "Happy", "Euphoric"],
    acousticness: ["Electronic", "Processed", "Mixed", "Acoustic", "Very Acoustic"],
  }

  const index = Math.floor(value * 5)
  return labels[feature]?.[Math.min(index, 4)] || "Unknown"
}

export default function Component() {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { query, setQuery, results, isLoading, error, clearResults } = useSpotifySearch()
  const [selectedSongs, setSelectedSongs] = useState<SpotifyTrack[]>([])
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([])
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [recentTracks, setRecentTracks] = useState<any[]>([])

  // Function to fetch recent tracks
  const fetchRecentTracks = useCallback(async () => {
    try {
      const response = await fetch("/api/recent-tracks?limit=3")
      const data = await response.json()
      if (data.tracks) {
        setRecentTracks(data.tracks)
      }
    } catch (error) {
      console.error("Failed to fetch recent tracks:", error)
    }
  }, [])

  // Fetch recent tracks on component mount
  useEffect(() => {
    fetchRecentTracks()
  }, [fetchRecentTracks])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchTrackDetails = async (trackId: string): Promise<SpotifyTrack | null> => {
    try {
      const response = await fetch("/api/spotify/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      })

      if (!response.ok) {
        console.error(`Failed to fetch track details: ${response.status}`)
        return null
      }

      const data = await response.json()

      if (data.error) {
        console.error("Spotify API error:", data.error)
        return null
      }

      return data.track
    } catch (error) {
      console.error("Failed to fetch track details:", error)
      return null
    }
  }

  const addSelectedSong = async (track: SpotifyTrack) => {
    if (selectedSongs.length >= 5) return
    if (selectedSongs.some((song) => song.id === track.id)) return

    setLoadingDetails(track.id)

    // Try to fetch detailed track information
    const detailedTrack = await fetchTrackDetails(track.id)

    if (detailedTrack) {
      setSelectedSongs((prev) => [...prev, detailedTrack])
    } else {
      // Fallback to basic track info if detailed fetch fails
      console.warn("Using basic track info as fallback")
      setSelectedSongs((prev) => [...prev, { ...track, genres: [], audio_features: null }])
    }

    setLoadingDetails(null)
    setQuery("")
    setShowSuggestions(false)
  }

  const removeSelectedSong = (trackId: string) => {
    setSelectedSongs((prev) => prev.filter((song) => song.id !== trackId))
  }

  const handleGenerateMusic = async () => {
    setIsGenerating(true)
    setGenerationError(null)

    try {
      const response = await fetch("/api/generate-music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          selectedSongs: selectedSongs,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate music")
      }

      if (data.success && data.track) {
        setGeneratedTracks((prev) => [data.track, ...prev])

        // Clear the form
        setDescription("")
        setSelectedSongs([])

        // Start polling for completion status
        pollTrackStatus(data.track.id)

        // Refresh recent tracks after successful generation
        fetchRecentTracks()
      }
    } catch (error) {
      console.error("Generation error:", error)
      setGenerationError(error instanceof Error ? error.message : "Failed to generate music")
    } finally {
      setIsGenerating(false)
    }
  }

  const pollTrackStatus = async (trackId: string) => {
    const maxAttempts = 30 // Poll for up to 5 minutes (30 * 10 seconds)
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/generate-music?id=${trackId}`)
        const data = await response.json()

        if (data.track) {
          setGeneratedTracks((prev) =>
            prev.map((track) => (track.id === trackId ? { ...track, ...data.track } : track)),
          )

          // Stop polling if completed or failed
          if (data.track.status === "completed" || data.track.status === "failed") {
            return
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000) // Poll every 10 seconds
        }
      } catch (error) {
        console.error("Status polling error:", error)
      }
    }

    // Start polling after a short delay
    setTimeout(poll, 5000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-fuchsia-700 to-cyan-500">
      {/* Header */}
      <header className="backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-400 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MelodyMaker.ai</h1>
                <p className="text-xs text-slate-400">AI Music Generator</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
                <Headphones className="w-3 h-3 mr-1" />
                Beta
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-orange-600 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Make Your Melody
          </h2>
          <p className="text-lg text-shadow-lg text-neutral-300 max-w-2xl mx-auto">
            Generate unique music and soundscapes with AI. Search for inspiration or describe your perfect sound.
          </p>
        </div>

        {/* Generation Error Alert */}
        {generationError && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{generationError}</AlertDescription>
          </Alert>
        )}

        {/* Search Section */}
        <Card className="mb-8 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Search className="w-5 h-5 mr-2 text-orange-400" />
              Find Inspiration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search for songs, artists, or genres on Spotify..."
                  className="pl-10 pr-10 bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-orange-400 focus:ring-orange-400/20"
                />
                {isLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 animate-spin" />
                )}
              </div>

              {/* Autocomplete Suggestions */}
              {showSuggestions && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                  {error && <div className="p-3 text-red-400 text-sm border-b border-slate-700">{error}</div>}

                  {results.length > 0 && (
                    <div className="py-2">
                      {results.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => addSelectedSong(track)}
                          disabled={
                            selectedSongs.length >= 5 ||
                            selectedSongs.some((song) => song.id === track.id) ||
                            loadingDetails === track.id
                          }
                          className="w-full px-3 py-2 flex items-center space-x-3 hover:bg-slate-700/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {track.image && (
                            <img
                              src={track.image || "/placeholder.svg"}
                              alt={track.album}
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{track.name}</p>
                            <p className="text-slate-400 text-xs truncate">
                              {track.artist} • {track.album}
                            </p>
                          </div>
                          {loadingDetails === track.id ? (
                            <Loader2 className="w-4 h-4 text-orange-400 animate-spin flex-shrink-0" />
                          ) : (
                            <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isLoading && results.length === 0 && query.length >= 2 && !error && (
                    <div className="p-3 text-slate-400 text-sm text-center">No tracks found for "{query}"</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Songs Section */}
        {selectedSongs.length > 0 && (
          <Card className="mb-8 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-pink-400" />
                  Selected Inspiration
                </div>
                <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                  {selectedSongs.length}/5
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {selectedSongs.map((track) => (
                  <div key={track.id} className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/50">
                    {/* Track Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {track.image && (
                          <img
                            src={track.image || "/placeholder.svg"}
                            alt={track.album}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{track.name}</p>
                          <p className="text-slate-400 text-xs truncate">
                            {track.artist} • {track.album}
                          </p>
                          {track.duration_ms && (
                            <p className="text-slate-500 text-xs">
                              {Math.floor(track.duration_ms / 60000)}:
                              {String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {track.external_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 p-0 text-slate-400 hover:text-green-400"
                            onClick={() => window.open(track.external_url, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-8 h-8 p-0 text-slate-400 hover:text-red-400"
                          onClick={() => removeSelectedSong(track.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Genres */}
                    {track.genres && track.genres.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {track.genres.slice(0, 4).map((genre) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className="text-xs border-orange-400/30 text-orange-300 bg-orange-400/5"
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Features */}
                    {track.audio_features && (
                      <div className="space-y-3">
                        {/* Key and Tempo */}
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center space-x-1">
                            <Music2 className="w-3 h-3 text-purple-400" />
                            <span className="text-slate-400">Key:</span>
                            <span className="text-white">
                              {getKeyName(track.audio_features.key, track.audio_features.mode)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span className="text-slate-400">Tempo:</span>
                            <span className="text-white">{track.audio_features.tempo} BPM</span>
                          </div>
                        </div>

                        {/* Audio Characteristics */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400 flex items-center">
                                <Zap className="w-3 h-3 mr-1 text-yellow-400" />
                                Energy
                              </span>
                              <span className="text-xs text-white">
                                {getFeatureLabel("energy", track.audio_features.energy)}
                              </span>
                            </div>
                            <Progress value={track.audio_features.energy * 100} className="h-1" />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400 flex items-center">
                                <HeartIcon className="w-3 h-3 mr-1 text-pink-400" />
                                Mood
                              </span>
                              <span className="text-xs text-white">
                                {getFeatureLabel("valence", track.audio_features.valence)}
                              </span>
                            </div>
                            <Progress value={track.audio_features.valence * 100} className="h-1" />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400">Danceability</span>
                              <span className="text-xs text-white">
                                {getFeatureLabel("danceability", track.audio_features.danceability)}
                              </span>
                            </div>
                            <Progress value={track.audio_features.danceability * 100} className="h-1" />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400">Acoustic</span>
                              <span className="text-xs text-white">
                                {getFeatureLabel("acousticness", track.audio_features.acousticness)}
                              </span>
                            </div>
                            <Progress value={track.audio_features.acousticness * 100} className="h-1" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {selectedSongs.length >= 5 && (
                <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-orange-400 text-xs text-center">
                    Maximum of 5 songs selected. Remove a song to add another.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generation Section */}
        <Card className="mb-8 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Music className="w-5 h-5 mr-2 text-purple-400" />
              Describe Your Sound
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the music you want to generate... (e.g., 'A relaxing lofi beat with soft piano, vinyl crackle, and gentle rain in the background')"
              className="min-h-[120px] bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleGenerateMusic}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-300 hover:from-pink-600 hover:to-rose-400 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:hover:bg-slate-700"
                disabled={isGenerating || (selectedSongs.length === 0 && !description.trim())}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4 mr-2" />
                    Generate Music
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Tracks Section */}
        {generatedTracks.length > 0 && (
          <Card className="mb-8 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Music className="w-5 h-5 mr-2 text-green-400" />
                Your Generated Music
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedTracks.map((track) => (
                  <div key={track.id} className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Music className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{track.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {track.status === "generating" && (
                              <>
                                <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />
                                <span className="text-orange-400 text-xs">Generating...</span>
                              </>
                            )}
                            {track.status === "completed" && (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs">Ready</span>
                                {track.duration && <span className="text-slate-400 text-xs">• {track.duration}s</span>}
                              </>
                            )}
                            {track.status === "failed" && (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span className="text-red-400 text-xs">Failed</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {track.status === "completed" && track.file_url && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 text-slate-400 hover:text-green-400"
                              onClick={() => {
                                // In a real implementation, this would play the audio
                                console.log("Playing:", track.file_url)
                              }}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 text-slate-400 hover:text-blue-400"
                              onClick={() => {
                                // In a real implementation, this would download the file
                                window.open(track.file_url, "_blank")
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Generations */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-lg">Recent Generations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTracks.length > 0 ? (
              recentTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-orange-400 hover:text-orange-300">
                      <Play className="w-4 h-4" />
                    </Button>
                    <div>
                      <p className="text-white text-sm font-medium">{track.title}</p>
                      <p className="text-slate-400 text-xs">
                        {track.duration
                          ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}`
                          : "0:30"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-slate-400 hover:text-pink-400">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-8 h-8 p-0 text-slate-400 hover:text-green-400"
                      onClick={() => {
                        if (track.file_url) {
                          window.open(track.file_url, "_blank")
                        }
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-4">
                <p className="text-sm">No recent generations yet</p>
                <p className="text-xs">Generate your first track to see it here!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-lg">Popular This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { title: "Sunset Lounge", duration: "3:45", likes: 24 },
              { title: "Urban Nights", duration: "2:58", likes: 19 },
              { title: "Peaceful Morning", duration: "4:33", likes: 31 },
            ].map((track, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-orange-400 hover:text-orange-300">
                    <Play className="w-4 h-4" />
                  </Button>
                  <div>
                    <p className="text-white text-sm font-medium">{track.title}</p>
                    <p className="text-slate-400 text-xs">{track.duration}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-slate-400 hover:text-pink-400">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-slate-400">{track.likes}</span>
                  <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-slate-400 hover:text-green-400">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-slate-400">
            <p className="text-sm">♪ + ♥ = MelodyMaker.ai © 2025</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
