import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

// Constant-time string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): Promise<boolean> {
  if (!header || !header.startsWith("sha256=")) return false;
  const provided = header.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, provided);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    if (req.method === "POST") {
      // Require HMAC signature verification — refuse if secret not configured
      if (!WHATSAPP_APP_SECRET) {
        console.error("WHATSAPP_APP_SECRET not configured — rejecting webhook");
        return new Response(JSON.stringify({ error: "Server not configured" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawBody = await req.text();
      const sigHeader = req.headers.get("x-hub-signature-256");
      const valid = await verifyMetaSignature(rawBody, sigHeader, WHATSAPP_APP_SECRET);
      if (!valid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = JSON.parse(rawBody);

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
              if (media?.caption) messageData.text_content = media.caption;
            }

            const { data: inserted, error: insertError } = await supabase
              .from("whatsapp_messages")
              .upsert(messageData, { onConflict: "wa_message_id" })
              .select()
              .single();

            if (insertError) {
              console.error("Insert error:", insertError);
              continue;
            }

            if (messageData.media_id && WHATSAPP_ACCESS_TOKEN) {
              const mediaRes = await fetch(
                `https://graph.facebook.com/v21.0/${messageData.media_id}`,
                { headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` } }
              );
              const mediaInfo = await mediaRes.json();

              if (mediaInfo.url) {
                const fileRes = await fetch(mediaInfo.url, {
                  headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
                });
                const fileBuffer = await fileRes.arrayBuffer();
                const fileBytes = new Uint8Array(fileBuffer);

                const ext = getExtFromMime(messageData.media_mime_type);
                const storagePath = `${msg.from}/${inserted.id}.${ext}`;

                const { error: uploadError } = await supabase.storage
                  .from("whatsapp-media")
                  .upload(storagePath, fileBytes, {
                    contentType: messageData.media_mime_type,
                    upsert: true,
                  });

                if (!uploadError) {
                  // Store storage path (not public URL). Frontend generates signed URLs on demand.
                  await supabase
                    .from("whatsapp_messages")
                    .update({
                      media_url: storagePath,
                      media_size: fileBytes.length,
                      status: "downloaded",
                    })
                    .eq("id", inserted.id);
                }
              }
            }

            if (msg.type === "text" || msg.type === "document") {
              try {
                await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-analyze`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                    "x-internal-service-role": SUPABASE_SERVICE_ROLE_KEY,
                  },
                  body: JSON.stringify({ messageId: inserted.id }),
                });
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
