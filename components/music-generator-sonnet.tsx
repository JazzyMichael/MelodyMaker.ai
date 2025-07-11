"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Loader2,
  ExternalLink,
  X,
  Music2,
  Zap,
  HeartIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  Music,
  Play,
  Download,
  Heart,
  Headphones,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useSpotifySearch } from "@/hooks/use-spotify-search";
import { useSupabaseBroadcastChannel } from "@/hooks/use-supabase-realtime";
import { AudioWaveform } from "@/components/audio-waveform";

interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  key: number;
  mode: number;
  time_signature: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  image?: string;
  preview_url?: string;
  external_url: string;
  genres?: string[];
  audio_features?: AudioFeatures;
  popularity?: number;
  duration_ms?: number;
}

interface GeneratedTrack {
  id: string;
  title: string;
  status: "generating" | "completed" | "failed";
  file_url?: string;
  duration?: number;
  created_at: string;
  estimated_completion?: string;
  user_description?: string;
  description?: string;
  genres?: string[];
  selected_songs?: any[];
  generation_params?: any;
  tempo?: number;
  energy?: number;
  valence?: number;
  error_message?: string;
}

// Helper functions for audio features
const getKeyName = (key: number, mode: number) => {
  const keys = [
    "C",
    "C♯",
    "D",
    "D♯",
    "E",
    "F",
    "F♯",
    "G",
    "G♯",
    "A",
    "A♯",
    "B",
  ];
  const keyName = keys[key] || "?";
  const modeName = mode === 1 ? "Major" : "Minor";
  return `${keyName} ${modeName}`;
};

const getFeatureLabel = (feature: string, value: number) => {
  const labels: Record<string, string[]> = {
    energy: ["Calm", "Relaxed", "Moderate", "Energetic", "High Energy"],
    danceability: [
      "Not Danceable",
      "Low",
      "Moderate",
      "Danceable",
      "Very Danceable",
    ],
    valence: ["Sad", "Melancholic", "Neutral", "Happy", "Euphoric"],
    acousticness: [
      "Electronic",
      "Processed",
      "Mixed",
      "Acoustic",
      "Very Acoustic",
    ],
  };

  const index = Math.floor(value * 5);
  return labels[feature]?.[Math.min(index, 4)] || "Unknown";
};

export default function Component() {
  const searchRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState<SpotifyTrack[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [isLoadingTrackDetails, setIsLoadingTrackDetails] = useState(false);
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [recentTracks, setRecentTracks] = useState<GeneratedTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<GeneratedTrack | null>(
    null
  );

  const { query, setQuery, results, isLoading, error } = useSpotifySearch();

  const audioPlayer = useAudioPlayer();

  useSupabaseBroadcastChannel({
    onReceive: (payload) => {
      console.log("Broadcast Payload:", payload);

      if (payload?.status === "completed") {
        // Update generated tracks with new track
        const newTrack: GeneratedTrack = {
          ...payload.track,
          status: "completed",
        };

        setGeneratedTracks((prev) => [newTrack, ...prev]);
        setSelectedTrack(newTrack);
        setIsGenerating(false);

        // Refresh recent tracks
        fetchRecentTracks();
      } else if (payload?.status === "failed") {
        // Update generated tracks with failure status
        setGeneratedTracks((prev) =>
          prev.map((track) =>
            track.id === payload.track.id
              ? { ...track, status: "failed", error_message: payload.error }
              : track
          )
        );

        // If the failed track is selected, clear it
        if (selectedTrack?.id === payload.track.id) {
          setSelectedTrack(null);
        }

        setIsGenerating(false);
      }
    },
  });

  // Function to fetch recent tracks
  const fetchRecentTracks = useCallback(async () => {
    try {
      const response = await fetch("/api/recent-tracks?limit=3");

      if (!response.ok) {
        console.error("Failed to fetch recent tracks:", response.status);
        return;
      }

      const data = await response.json();
      if (data.tracks) {
        setRecentTracks(data.tracks);
      }
    } catch (error) {
      console.error("Failed to fetch recent tracks:", error);
    }
  }, []);

  // Function to fetch track details
  const fetchTrackDetails = useCallback(async (trackId: string) => {
    setIsLoadingTrackDetails(true);
    try {
      const response = await fetch(`/api/generate-music?id=${trackId}`);

      if (!response.ok) {
        console.error("Failed to fetch track details:", response.status);
        return null;
      }

      const data = await response.json();
      if (data.track) {
        setSelectedTrack(data.track);
      }
    } catch (error) {
      console.error("Failed to fetch track details:", error);
    } finally {
      setIsLoadingTrackDetails(false);
    }
  }, []);

  // Function to refresh track status (for manual refresh)
  const refreshTrackStatus = useCallback(
    async (trackId: string) => {
      try {
        const response = await fetch(`/api/generate-music?id=${trackId}`);
        const data = await response.json();

        if (data.track) {
          // Update generated tracks
          setGeneratedTracks((prev) =>
            prev.map((track) =>
              track.id === trackId ? { ...track, ...data.track } : track
            )
          );

          // Update selected track if it's the same one
          if (selectedTrack?.id === trackId) {
            setSelectedTrack((prev) =>
              prev ? { ...prev, ...data.track } : null
            );
          }

          // Refresh recent tracks if status changed to completed
          if (data.track.status === "completed") {
            fetchRecentTracks();
          }
        }
      } catch (error) {
        console.error("Failed to refresh track status:", error);
      }
    },
    [selectedTrack?.id, fetchRecentTracks]
  );

  // Fetch recent tracks on component mount
  useEffect(() => {
    fetchRecentTracks();
  }, [fetchRecentTracks]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSpotifyTrackDetails = async (
    trackId: string
  ): Promise<SpotifyTrack | null> => {
    try {
      const response = await fetch("/api/spotify/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });

      if (!response.ok) {
        console.error(`Failed to fetch track details: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.error) {
        console.error("Spotify API error:", data.error);
        return null;
      }

      return data.track;
    } catch (error) {
      console.error("Failed to fetch track details:", error);
      return null;
    }
  };

  const addSelectedSong = async (track: SpotifyTrack) => {
    if (selectedSongs.length >= 5) return;
    if (selectedSongs.some((song) => song.id === track.id)) return;

    setLoadingDetails(track.id);

    // Try to fetch detailed track information
    const detailedTrack = await fetchSpotifyTrackDetails(track.id);

    if (detailedTrack) {
      setSelectedSongs((prev) => [...prev, detailedTrack]);
    } else {
      // Fallback to basic track info if detailed fetch fails
      console.warn("Using basic track info as fallback");
      setSelectedSongs((prev) => [
        ...prev,
        { ...track, genres: [], audio_features: undefined },
      ]);
    }

    setLoadingDetails(null);
    setQuery("");
    setShowSuggestions(false);
  };

  const removeSelectedSong = (trackId: string) => {
    setSelectedSongs((prev) => prev.filter((song) => song.id !== trackId));
  };

  const handleGenerateMusic = async () => {
    setIsGenerating(true);
    setGenerationError(null);

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
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 500 && data.error?.includes("not configured")) {
          throw new Error(
            "Service not properly configured. Please check your API keys."
          );
        }
        throw new Error(data.error || "Failed to generate music");
      }

      if (data.success && data.track) {
        setGeneratedTracks((prev) => [data.track, ...prev]);

        // Clear the form
        setDescription("");
        setSelectedSongs([]);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate music"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTrack = (track: GeneratedTrack) => {
    if (selectedTrack?.id === track.id) {
      setSelectedTrack(null);
    } else {
      fetchTrackDetails(track.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-950 via-fuchsia-700 to-cyan-500">
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
              <Badge
                variant="secondary"
                className="bg-slate-800 text-slate-300 border-slate-700 select-none"
              >
                <Headphones className="w-3 h-3 mr-1" />
                Beta
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-orange-600 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Make Your Melody
          </h2>
          <p className="text-lg text-shadow-lg text-neutral-300 max-w-2xl mx-auto">
            Generate unique music and soundscapes with AI. Search for
            inspiration or describe your perfect sound.
          </p>
        </div>

        {/* Generation Error Alert */}
        {generationError && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {generationError}
            </AlertDescription>
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
                    setQuery(e.target.value);
                    setShowSuggestions(true);
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
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {error && (
                    <div className="p-3 text-red-400 text-sm border-b border-slate-700">
                      {error}
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="py-2">
                      {results.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => addSelectedSong(track)}
                          disabled={
                            selectedSongs.length >= 5 ||
                            selectedSongs.some(
                              (song) => song.id === track.id
                            ) ||
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
                            <p className="text-white text-sm font-medium truncate">
                              {track.name}
                            </p>
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

                  {!isLoading &&
                    results.length === 0 &&
                    query.length >= 2 &&
                    !error && (
                      <div className="p-3 text-slate-400 text-sm text-center">
                        No tracks found for "{query}"
                      </div>
                    )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Songs Section */}
        {/* Removed backdrop-blur-sm for z-index */}
        {selectedSongs.length > 0 && (
          <Card className="mb-8 bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-pink-400" />
                  Selected Inspiration
                </div>
                <Badge
                  variant="secondary"
                  className="bg-slate-700 text-slate-300"
                >
                  {selectedSongs.length}/5
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {selectedSongs.map((track) => (
                  <div
                    key={track.id}
                    className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/50"
                  >
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
                          <p className="text-white text-sm font-medium truncate">
                            {track.name}
                          </p>
                          <p className="text-slate-400 text-xs truncate">
                            {track.artist} • {track.album}
                          </p>
                          {track.duration_ms && (
                            <p className="text-slate-500 text-xs">
                              {Math.floor(track.duration_ms / 60000)}:
                              {String(
                                Math.floor((track.duration_ms % 60000) / 1000)
                              ).padStart(2, "0")}
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
                            onClick={() =>
                              window.open(track.external_url, "_blank")
                            }
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
                              {getKeyName(
                                track.audio_features.key,
                                track.audio_features.mode
                              )}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span className="text-slate-400">Tempo:</span>
                            <span className="text-white">
                              {track.audio_features.tempo} BPM
                            </span>
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
                                {getFeatureLabel(
                                  "energy",
                                  track.audio_features.energy
                                )}
                              </span>
                            </div>
                            <Progress
                              value={track.audio_features.energy * 100}
                              className="h-1"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400 flex items-center">
                                <HeartIcon className="w-3 h-3 mr-1 text-pink-400" />
                                Mood
                              </span>
                              <span className="text-xs text-white">
                                {getFeatureLabel(
                                  "valence",
                                  track.audio_features.valence
                                )}
                              </span>
                            </div>
                            <Progress
                              value={track.audio_features.valence * 100}
                              className="h-1"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400">
                                Danceability
                              </span>
                              <span className="text-xs text-white">
                                {getFeatureLabel(
                                  "danceability",
                                  track.audio_features.danceability
                                )}
                              </span>
                            </div>
                            <Progress
                              value={track.audio_features.danceability * 100}
                              className="h-1"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-400">
                                Acoustic
                              </span>
                              <span className="text-xs text-white">
                                {getFeatureLabel(
                                  "acousticness",
                                  track.audio_features.acousticness
                                )}
                              </span>
                            </div>
                            <Progress
                              value={track.audio_features.acousticness * 100}
                              className="h-1"
                            />
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
        <Card className="mb-8 bg-slate-800/50 border-slate-700/50 z-[555555]">
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
            <Button
              onClick={handleGenerateMusic}
              className="flex-1 w-full bg-gradient-to-r from-pink-500 to-rose-300 hover:from-pink-600 hover:to-rose-400 text-white font-medium select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:hover:bg-slate-700"
              disabled={
                isGenerating ||
                (selectedSongs.length === 0 && !description.trim())
              }
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
                  <div
                    key={track.id}
                    className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Music className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">
                            {track.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {track.status === "generating" && (
                              <>
                                <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />
                                <span className="text-orange-400 text-xs">
                                  Generating...
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-2 text-xs text-slate-400 hover:text-orange-400"
                                  onClick={() => refreshTrackStatus(track.id)}
                                >
                                  Refresh
                                </Button>
                              </>
                            )}
                            {track.status === "completed" && (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs">
                                  Ready
                                </span>
                                {track.duration && (
                                  <span className="text-slate-400 text-xs">
                                    • {track.duration}s
                                  </span>
                                )}
                              </>
                            )}
                            {track.status === "failed" && (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span className="text-red-400 text-xs">
                                  Failed
                                </span>
                                {track.error_message && (
                                  <span className="text-red-400 text-xs">
                                    • {track.error_message}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {/* Progress bar for currently playing track */}
                          {audioPlayer.currentTrackId === track.id &&
                            audioPlayer.duration > 0 && (
                              <div className="mt-2">
                                <Progress
                                  value={
                                    (audioPlayer.currentTime /
                                      audioPlayer.duration) *
                                    100
                                  }
                                  className="h-1"
                                />
                                <p className="text-slate-500 text-xs mt-1">
                                  {Math.floor(audioPlayer.currentTime / 60)}:
                                  {String(
                                    Math.floor(audioPlayer.currentTime % 60)
                                  ).padStart(2, "0")}{" "}
                                  /{Math.floor(audioPlayer.duration / 60)}:
                                  {String(
                                    Math.floor(audioPlayer.duration % 60)
                                  ).padStart(2, "0")}
                                </p>
                              </div>
                            )}
                          {/* Error message */}
                          {audioPlayer.error &&
                            audioPlayer.currentTrackId === track.id && (
                              <p className="text-red-400 text-xs mt-1">
                                {audioPlayer.error}
                              </p>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {track.status === "completed" && track.file_url && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`w-8 h-8 p-0 transition-colors ${
                                audioPlayer.currentTrackId === track.id &&
                                audioPlayer.isPlaying
                                  ? "text-green-300 hover:text-green-200"
                                  : "text-slate-400 hover:text-green-400"
                              }`}
                              onClick={() =>
                                audioPlayer.playTrack(track.id, track.file_url!)
                              }
                              disabled={
                                audioPlayer.isLoading &&
                                audioPlayer.currentTrackId === track.id
                              }
                            >
                              {audioPlayer.isLoading &&
                              audioPlayer.currentTrackId === track.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : audioPlayer.currentTrackId === track.id &&
                                audioPlayer.isPlaying ? (
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <div className="w-1 h-3 bg-current rounded-full mr-0.5 animate-pulse"></div>
                                  <div
                                    className="w-1 h-4 bg-current rounded-full mr-0.5 animate-pulse"
                                    style={{ animationDelay: "0.1s" }}
                                  ></div>
                                  <div
                                    className="w-1 h-2 bg-current rounded-full animate-pulse"
                                    style={{ animationDelay: "0.2s" }}
                                  ></div>
                                </div>
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 text-slate-400 hover:text-blue-400"
                              onClick={() =>
                                window.open(track.file_url, "_blank")
                              }
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

        {/* Recent Generations and Track Details Section */}
        <div
          className={
            selectedTrack ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""
          }
        >
          {/* Recent Generations */}
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                Recent Generations
              </CardTitle>
              <CardDescription className="text-slate-400">
                Select a track to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTracks.length > 0 ? (
                recentTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                      selectedTrack?.id === track.id
                        ? "bg-slate-700/50 border border-purple-500/50"
                        : "bg-slate-900/30 hover:bg-slate-900/50 border border-transparent"
                    }`}
                    onClick={() => handleSelectTrack(track)}
                  >
                    <div className="flex items-center space-x-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`w-8 h-8 p-0 transition-colors ${
                          audioPlayer.currentTrackId === track.id &&
                          audioPlayer.isPlaying
                            ? "text-orange-300 hover:text-orange-200"
                            : "text-orange-400 hover:text-orange-300"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (track.file_url) {
                            audioPlayer.playTrack(track.id, track.file_url);
                          } else {
                            console.warn(
                              "No audio URL available for track:",
                              track.id
                            );
                          }
                        }}
                        disabled={
                          audioPlayer.isLoading &&
                          audioPlayer.currentTrackId === track.id
                        }
                      >
                        {audioPlayer.isLoading &&
                        audioPlayer.currentTrackId === track.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : audioPlayer.currentTrackId === track.id &&
                          audioPlayer.isPlaying ? (
                          <div className="w-4 h-4 flex items-center justify-center">
                            <div className="w-1 h-3 bg-current rounded-full mr-0.5 animate-pulse"></div>
                            <div
                              className="w-1 h-4 bg-current rounded-full mr-0.5 animate-pulse"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-1 h-2 bg-current rounded-full animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">
                          {track.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <p className="text-slate-400 text-xs">
                            {track.duration
                              ? `${Math.floor(track.duration / 60)}:${String(
                                  track.duration % 60
                                ).padStart(2, "0")}`
                              : "< 0:30"}
                          </p>
                          {audioPlayer.currentTrackId === track.id &&
                            audioPlayer.duration > 0 && (
                              <>
                                <span className="text-slate-500 text-xs">
                                  •
                                </span>
                                <p className="text-slate-500 text-xs">
                                  {Math.floor(audioPlayer.currentTime / 60)}:
                                  {String(
                                    Math.floor(audioPlayer.currentTime % 60)
                                  ).padStart(2, "0")}{" "}
                                  /{Math.floor(audioPlayer.duration / 60)}:
                                  {String(
                                    Math.floor(audioPlayer.duration % 60)
                                  ).padStart(2, "0")}
                                </p>
                              </>
                            )}
                        </div>
                        {/* Progress bar for currently playing track */}
                        {/* {audioPlayer.currentTrackId === track.id &&
                          audioPlayer.duration > 0 && (
                            <div className="mt-1">
                              <Progress
                                value={
                                  (audioPlayer.currentTime /
                                    audioPlayer.duration) *
                                  100
                                }
                                className="h-1"
                              />
                            </div>
                          )} */}
                        {/* Waveform for currently playing track */}
                        {audioPlayer.currentTrackId === track.id &&
                          audioPlayer.duration > 0 && (
                            <div className="mt-2">
                              <AudioWaveform
                                audioUrl={track.file_url}
                                isPlaying={audioPlayer.isPlaying}
                                currentTime={audioPlayer.currentTime}
                                duration={audioPlayer.duration}
                                onSeek={audioPlayer.seekTo}
                                className="rounded"
                                height={24}
                                barWidth={1}
                                barGap={1}
                              />
                            </div>
                          )}
                        {/* Error message */}
                        {audioPlayer.error &&
                          audioPlayer.currentTrackId === track.id && (
                            <p className="text-red-400 text-xs mt-1">
                              {audioPlayer.error}
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 text-slate-400 hover:text-pink-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Favorite functionality would go here
                        }}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 text-slate-400 hover:text-green-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (track.file_url) {
                            window.open(track.file_url, "_blank");
                          }
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`w-8 h-8 p-0 text-slate-400 hover:text-purple-400 ${
                          selectedTrack?.id === track.id
                            ? "text-purple-400"
                            : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTrack(track);
                        }}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-4">
                  <p className="text-sm">No recent generations yet</p>
                  <p className="text-xs">
                    Generate your first track to see it here!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Track Details - Only show when a track is selected */}
          {selectedTrack && (
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Info className="w-5 h-5 mr-2 text-purple-400" />
                    Track Details
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-300"
                    onClick={() => setSelectedTrack(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingTrackDetails ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">
                          {selectedTrack.title}
                        </h3>
                        {selectedTrack.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30 text-white"
                            onClick={() =>
                              audioPlayer.playTrack(
                                selectedTrack.id,
                                selectedTrack.file_url!
                              )
                            }
                          >
                            {audioPlayer.currentTrackId === selectedTrack.id &&
                            audioPlayer.isPlaying ? (
                              <div className="w-4 h-4 mr-2 flex items-center justify-center">
                                <div className="w-1 h-3 bg-current rounded-full mr-0.5 animate-pulse"></div>
                                <div
                                  className="w-1 h-4 bg-current rounded-full mr-0.5 animate-pulse"
                                  style={{ animationDelay: "0.1s" }}
                                ></div>
                                <div
                                  className="w-1 h-2 bg-current rounded-full animate-pulse"
                                  style={{ animationDelay: "0.2s" }}
                                ></div>
                              </div>
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            {audioPlayer.currentTrackId === selectedTrack.id &&
                            audioPlayer.isPlaying
                              ? "Playing"
                              : "Play Track"}
                          </Button>
                        )}
                      </div>

                      {/* Created date */}
                      <div className="flex items-center text-sm text-slate-400">
                        <Calendar className="w-4 h-4 mr-1" />
                        {selectedTrack.created_at && (
                          <span>
                            Created on{" "}
                            {format(
                              new Date(selectedTrack.created_at),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {selectedTrack.user_description && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-slate-300 mb-1">
                            Prompt
                          </h4>
                          <p className="text-sm text-slate-400 bg-slate-900/50 p-3 rounded-md">
                            {selectedTrack.user_description}
                          </p>
                        </div>
                      )}

                      {/* Genres */}
                      {selectedTrack.genres &&
                        selectedTrack.genres.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-2">
                              Genres
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedTrack.genres.map((genre, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs border-purple-400/30 text-purple-300 bg-purple-400/5"
                                >
                                  {genre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Audio characteristics */}
                      {(selectedTrack.energy !== undefined ||
                        selectedTrack.valence !== undefined ||
                        selectedTrack.tempo !== undefined) && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-slate-300 mb-2">
                            Audio Characteristics
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedTrack.energy !== undefined && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-slate-400 flex items-center">
                                    <Zap className="w-3 h-3 mr-1 text-yellow-400" />
                                    Energy
                                  </span>
                                  <span className="text-xs text-white">
                                    {getFeatureLabel(
                                      "energy",
                                      selectedTrack.energy
                                    )}
                                  </span>
                                </div>
                                <Progress
                                  value={selectedTrack.energy * 100}
                                  className="h-1"
                                />
                              </div>
                            )}

                            {selectedTrack.valence !== undefined && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-slate-400 flex items-center">
                                    <HeartIcon className="w-3 h-3 mr-1 text-pink-400" />
                                    Mood
                                  </span>
                                  <span className="text-xs text-white">
                                    {getFeatureLabel(
                                      "valence",
                                      selectedTrack.valence
                                    )}
                                  </span>
                                </div>
                                <Progress
                                  value={selectedTrack.valence * 100}
                                  className="h-1"
                                />
                              </div>
                            )}

                            {selectedTrack.tempo !== undefined && (
                              <div className="sm:col-span-2">
                                <div className="flex items-center space-x-1 mb-1">
                                  <Clock className="w-3 h-3 text-blue-400" />
                                  <span className="text-xs text-slate-400">
                                    Tempo:
                                  </span>
                                  <span className="text-xs text-white">
                                    {selectedTrack.tempo} BPM
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Inspiration tracks */}
                      {selectedTrack.selected_songs &&
                        selectedTrack.selected_songs.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-2">
                              Inspiration
                            </h4>
                            <div className="space-y-2">
                              {selectedTrack.selected_songs.map(
                                (song: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center p-2 bg-slate-900/30 rounded-md"
                                  >
                                    {song.image && (
                                      <img
                                        src={song.image || "/placeholder.svg"}
                                        alt={song.name}
                                        className="w-8 h-8 rounded object-cover mr-3"
                                      />
                                    )}
                                    <div>
                                      <p className="text-xs font-medium text-white">
                                        {song.name}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {song.artist}
                                      </p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Generation parameters */}
                      {selectedTrack.generation_params && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-slate-300 mb-2">
                            Generation Parameters
                          </h4>
                          <div className="bg-slate-900/30 p-3 rounded-md">
                            <pre className="text-xs text-slate-400 whitespace-pre-wrap">
                              {JSON.stringify(
                                selectedTrack.generation_params,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
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
  );
}
