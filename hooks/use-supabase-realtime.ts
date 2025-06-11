"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseSupabaseRealtimeOptions {
  tableName: string
  event?: "INSERT" | "UPDATE" | "DELETE" | "*"
  filter?: string
  filterValue?: any
  onEvent?: (payload: any) => void
}

export function useSupabaseRealtime({
  tableName,
  event = "*",
  filter,
  filterValue,
  onEvent,
}: UseSupabaseRealtimeOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number | null>(null)

  // Function to create and set up the channel
  const setupChannel = useCallback(() => {
    try {
      // Clean up any existing channel
      if (channel) {
        channel.unsubscribe()
      }

      // Create a new channel with a unique name
      const channelName = `realtime:${tableName}:${event}:${Date.now()}`

      // Start building the channel
      const newChannel = supabase.channel(channelName)

      // Configure the channel with table subscription
      let subscription = newChannel.on(
        "postgres_changes",
        {
          event: event,
          schema: "public",
          table: tableName,
        },
        (payload) => {
          // Apply additional filtering if needed
          if (filter && filterValue && payload.new && payload.new[filter] !== filterValue) {
            return
          }

          // Update last event timestamp
          setLastEventTimestamp(Date.now())

          // Call the onEvent callback if provided
          if (onEvent) {
            onEvent(payload)
          }
        },
      )

      // Add status change handlers
      subscription = subscription
        .on("system", { event: "connected" }, () => {
          console.log("Connected to Supabase Realtime")
          setIsConnected(true)
          setError(null)
        })
        .on("system", { event: "disconnected" }, () => {
          console.log("Disconnected from Supabase Realtime")
          setIsConnected(false)
        })
        .on("system", { event: "error" }, (err) => {
          console.error("Supabase Realtime error:", err)
          setError("Connection error")
          setIsConnected(false)
        })

      // Subscribe to the channel
      subscription.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to ${tableName} changes`)
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Failed to subscribe to ${tableName} changes`)
          setError("Subscription error")
        }
      })

      // Save the channel
      setChannel(newChannel)

      return newChannel
    } catch (err) {
      console.error("Error setting up Supabase Realtime:", err)
      setError("Setup error")
      setIsConnected(false)
      return null
    }
  }, [tableName, event, filter, filterValue, onEvent, channel])

  // Set up the channel on mount and clean up on unmount
  useEffect(() => {
    const newChannel = setupChannel()

    // Clean up function
    return () => {
      if (newChannel) {
        console.log("Unsubscribing from Supabase Realtime")
        newChannel.unsubscribe()
      }
    }
  }, [setupChannel])

  // Function to manually reconnect
  const reconnect = useCallback(() => {
    console.log("Manually reconnecting to Supabase Realtime")
    return setupChannel()
  }, [setupChannel])

  return {
    isConnected,
    error,
    lastEventTimestamp,
    reconnect,
  }
}
