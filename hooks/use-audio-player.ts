"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface AudioPlayerState {
  isPlaying: boolean
  currentTrackId: string | null
  duration: number
  currentTime: number
  isLoading: boolean
  error: string | null
}

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTrackId: null,
    duration: 0,
    currentTime: 0,
    isLoading: false,
    error: null,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    const audio = audioRef.current

    // Audio event listeners
    const handleLoadStart = () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
    }

    const handleCanPlay = () => {
      setState((prev) => ({ ...prev, isLoading: false }))
    }

    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration || 0,
        isLoading: false,
      }))
    }

    const handleTimeUpdate = () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime || 0 }))
    }

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }))
    }

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }))
    }

    const handleEnded = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTrackId: null,
        currentTime: 0,
      }))
    }

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: "Failed to load audio",
        currentTrackId: null,
      }))
    }

    // Add event listeners
    audio.addEventListener("loadstart", handleLoadStart)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)

    // Cleanup
    return () => {
      audio.removeEventListener("loadstart", handleLoadStart)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
      audio.pause()
      audio.src = ""
    }
  }, [])

  const playTrack = useCallback(
    async (trackId: string, audioUrl: string) => {
      if (!audioRef.current) return

      const audio = audioRef.current

      try {
        // If same track is playing, just toggle play/pause
        if (state.currentTrackId === trackId && !audio.paused) {
          audio.pause()
          return
        }

        // If different track or same track is paused
        if (state.currentTrackId !== trackId) {
          audio.src = audioUrl
          setState((prev) => ({
            ...prev,
            currentTrackId: trackId,
            error: null,
            currentTime: 0,
          }))
        }

        await audio.play()
      } catch (error) {
        console.error("Error playing audio:", error)
        setState((prev) => ({
          ...prev,
          error: "Failed to play audio",
          isPlaying: false,
          isLoading: false,
        }))
      }
    },
    [state.currentTrackId],
  )

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  const stopTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setState((prev) => ({
        ...prev,
        currentTrackId: null,
        isPlaying: false,
        currentTime: 0,
      }))
    }
  }, [])

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume))
    }
  }, [])

  return {
    ...state,
    playTrack,
    pauseTrack,
    stopTrack,
    seekTo,
    setVolume,
  }
}
