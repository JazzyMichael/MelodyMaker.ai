import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { createHmac, timingSafeEqual } from "node:crypto"

// Function to verify Replicate webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  try {
    const expectedSignature = createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("hex")

    const providedSignature = signature.replace("sha256=", "")

    return timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex")
    )
  } catch (error) {
    console.error("Error verifying webhook signature:", error)
    return false
  }
}

// Function to upload audio to Supabase storage
async function uploadToSupabaseStorage(audioUrl: string, fileName: string) {
  try {
    console.log("Downloading audio from:", audioUrl)

    // Download the audio file from Replicate with proper error handling
    const audioResponse = await fetch(audioUrl, {
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    if (!audioResponse.ok) {
      throw new Error(
        `Failed to fetch audio: ${audioResponse.status} ${audioResponse.statusText}`
      )
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    console.log("Audio downloaded, size:", audioBuffer.byteLength, "bytes")

    // Upload to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from("music")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      throw new Error(`Supabase storage error: ${error.message}`)
    }

    console.log("File uploaded to Supabase:", data.path)

    // Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("music")
      .getPublicUrl(fileName)

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    }
  } catch (error) {
    console.error("Error uploading to Supabase storage:", error)
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

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()

    // Verify webhook signature if secret is configured
    const signature = request.headers.get("replicate-signature")
    const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret)
      if (!isValid) {
        console.error("Invalid webhook signature")
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        )
      }
    }

    // Parse the webhook payload
    let webhookData
    try {
      webhookData = JSON.parse(body)
    } catch (error) {
      console.error("Invalid JSON in webhook payload:", error)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    console.log("Received Replicate webhook:", {
      id: webhookData.id,
      status: webhookData.status,
      created_at: webhookData.created_at,
    })

    // Extract prediction data
    const {
      id: predictionId,
      status,
      output,
      error: predictionError,
    } = webhookData

    if (!predictionId) {
      console.error("No prediction ID in webhook payload")
      return NextResponse.json(
        { error: "Missing prediction ID" },
        { status: 400 }
      )
    }

    // Find the track record by replicate_prediction_id
    const { data: tracks, error: fetchError } = await supabaseAdmin
      .from("tracks")
      .select("*")
      .eq("replicate_prediction_id", predictionId)
      .limit(1)

    if (fetchError) {
      console.error("Error fetching track by prediction ID:", fetchError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!tracks || tracks.length === 0) {
      console.error("No track found for prediction ID:", predictionId)
      return NextResponse.json({ error: "Track not found" }, { status: 404 })
    }

    const track = tracks[0]
    console.log("Found track:", track.id, "for prediction:", predictionId)

    // Handle different prediction statuses
    if (status === "succeeded" && output) {
      try {
        // Get the audio URL from output
        let audioUrl: string
        if (typeof output === "string") {
          audioUrl = output
        } else if (Array.isArray(output) && output.length > 0) {
          audioUrl = output[0]
        } else {
          throw new Error("Unexpected output format from Replicate")
        }

        console.log("Processing successful generation for track:", track.id)

        // Upload to Supabase storage
        const fileName = `${track.id}_${Date.now()}.mp3`
        const storageResult = await uploadToSupabaseStorage(audioUrl, fileName)

        // Update track record with success
        await updateTrackRecord(track.id, {
          status: "completed",
          file_url: storageResult.publicUrl,
          file_path: storageResult.path,
          duration: track.generation_params?.duration || 10,
          updated_at: new Date().toISOString(),
        })

        console.log("Successfully processed webhook for track:", track.id)
        return NextResponse.json({
          success: true,
          message: "Track updated successfully",
        })
      } catch (uploadError) {
        console.error("Failed to upload or update track:", uploadError)

        // Update track record with failure
        await updateTrackRecord(track.id, {
          status: "failed",
          error_message:
            uploadError instanceof Error
              ? uploadError.message
              : "Failed to upload audio",
          updated_at: new Date().toISOString(),
        })

        return NextResponse.json(
          { error: "Failed to process audio" },
          { status: 500 }
        )
      }
    } else if (status === "failed" || status === "canceled") {
      console.log("Generation failed or was canceled for track:", track.id)

      // Update track record with failure
      await updateTrackRecord(track.id, {
        status: "failed",
        error_message: predictionError || `Generation ${status}`,
        updated_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: "Track marked as failed",
      })
    } else if (status === "starting" || status === "processing") {
      console.log(
        "Generation in progress for track:",
        track.id,
        "status:",
        status
      )

      // Optionally update the track status to reflect current state
      await updateTrackRecord(track.id, {
        status: "generating",
        updated_at: new Date().toISOString(),
      })

      return NextResponse.json({ success: true, message: "Status updated" })
    } else {
      console.log("Unknown status received:", status, "for track:", track.id)
      return NextResponse.json({ success: true, message: "Status noted" })
    }
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ message: "Replicate webhook endpoint" })
}
