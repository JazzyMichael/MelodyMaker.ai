import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { RealtimeChannel } from "@supabase/supabase-js"

export function useSupabaseBroadcastChannel({
  channel = "new-track",
  event = "update",
  onReceive,
}: {
  channel?: string
  event?: string
  onReceive?: (payload: any) => void
}) {
  const channelRef = useRef<RealtimeChannel>(null)

  useEffect(() => {
    if (!channelRef.current) {
      const supabaseChannel = supabase.channel(channel)

      supabaseChannel
        .on("broadcast", { event }, (payload) => {
          if (onReceive) {
            onReceive(payload)
          } else {
            console.log("Broadcast payload:", payload)
          }
        })
        .subscribe()

      channelRef.current = supabaseChannel
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [channel, event, onReceive])

  return channelRef.current
}
