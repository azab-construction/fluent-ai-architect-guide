import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // GET = webhook verification from Meta
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
        console.log("Webhook verified successfully");
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    // POST = incoming message
    if (req.method === "POST") {
      const body = await req.json();
      console.log("Webhook received:", JSON.stringify(body).slice(0, 500));

      const entries = body?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value?.messages) continue;

          const contacts = value.contacts || [];
          const messages = value.messages || [];

          for (const msg of messages) {
            const contact = contacts.find((c: any) => c.wa_id === msg.from);
            const fromName = contact?.profile?.name || msg.from;

            let messageData: any = {
              wa_message_id: msg.id,
              from_number: msg.from,
              from_name: fromName,
              message_type: msg.type,
              status: "received",
            };

            if (msg.type === "text") {
              messageData.text_content = msg.text?.body;
            } else if (["image", "video", "audio", "document", "sticker"].includes(msg.type)) {
              const media = msg[msg.type];
              messageData.media_id = media?.id;
              messageData.media_mime_type = media?.mime_type;
              messageData.media_filename = media?.filename || `${msg.type}_${Date.now()}`;
              if (media?.caption) {
                messageData.text_content = media.caption;
              }
            }

            // Save message to DB
            const { data: inserted, error: insertError } = await supabase
              .from("whatsapp_messages")
              .upsert(messageData, { onConflict: "wa_message_id" })
              .select()
              .single();

            if (insertError) {
              console.error("Insert error:", insertError);
              continue;
            }

            // If media, download and process it
            if (messageData.media_id && WHATSAPP_ACCESS_TOKEN) {
              // Get media URL from WhatsApp
              const mediaRes = await fetch(
                `https://graph.facebook.com/v21.0/${messageData.media_id}`,
                { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
              );
              const mediaInfo = await mediaRes.json();

              if (mediaInfo.url) {
                // Download the file
                const fileRes = await fetch(mediaInfo.url, {
                  headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
                });
                const fileBuffer = await fileRes.arrayBuffer();
                const fileBytes = new Uint8Array(fileBuffer);

                // Upload to storage
                const ext = getExtFromMime(messageData.media_mime_type);
                const storagePath = `${msg.from}/${inserted.id}.${ext}`;

                const { error: uploadError } = await supabase.storage
                  .from("whatsapp-media")
                  .upload(storagePath, fileBytes, {
                    contentType: messageData.media_mime_type,
                    upsert: true,
                  });

                if (!uploadError) {
                  const { data: publicUrl } = supabase.storage
                    .from("whatsapp-media")
                    .getPublicUrl(storagePath);

                  await supabase
                    .from("whatsapp_messages")
                    .update({
                      media_url: publicUrl.publicUrl,
                      media_size: fileBytes.length,
                      status: "downloaded",
                    })
                    .eq("id", inserted.id);
                }
              }
            }

            // Trigger AI analysis for text and documents
            if (msg.type === "text" || msg.type === "document") {
              try {
                const analyzeRes = await fetch(
                  `${SUPABASE_URL}/functions/v1/whatsapp-analyze`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ messageId: inserted.id }),
                  }
                );
                console.log("Analysis triggered:", analyzeRes.status);
              } catch (e) {
                console.error("Analysis trigger failed:", e);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[mime] || "bin";
}
