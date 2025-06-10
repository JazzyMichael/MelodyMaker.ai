"use client"

import { useState, useEffect, useCallback } from "react"

interface SpotifyTrack {
  id: string
  name: string
  artist: string
  album: string
  image?: string
  preview_url?: string
  external_url: string
}

interface SpotifySearchResult {
  tracks: SpotifyTrack[]
  error?: string
}

export function useSpotifySearch() {
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
