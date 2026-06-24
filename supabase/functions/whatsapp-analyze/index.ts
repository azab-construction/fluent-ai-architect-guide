import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-service-role",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");

  if (!DEEPSEEK_API_KEY) {
    return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: accept either internal service-role header (from webhook) OR a valid user JWT
  const internalHeader = req.headers.get("x-internal-service-role");
  const isInternal = internalHeader && internalHeader === SUPABASE_SERVICE_ROLE_KEY;

  if (!isInternal) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { messageId } = await req.json();
    if (!messageId || typeof messageId !== "string") {
      return new Response(JSON.stringify({ error: "messageId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: message, error: fetchError } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let contentToAnalyze = "";
    if (message.text_content) {
      contentToAnalyze = message.text_content;
    } else if (message.media_url && message.media_mime_type?.startsWith("text")) {
      try {
        const res = await fetch(message.media_url);
        contentToAnalyze = await res.text();
      } catch {
        contentToAnalyze = `[ملف: ${message.media_filename}]`;
      }
    } else {
      contentToAnalyze = `[ملف وسائط: ${message.media_filename || message.message_type}]`;
    }

    const aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `أنت مساعد ذكي لتحليل رسائل واتساب الأعمال. قم بتحليل المحتوى واستخراج:
1. ملخص قصير
2. نوع المحتوى (استفسار/طلب/شكوى/معلومات/أخرى)
3. البيانات المهمة (أسماء، أرقام، تواريخ، مبالغ)
4. الإجراء المطلوب إن وُجد
أجب بصيغة JSON مع المفاتيح: summary, type, important_data, required_action`,
          },
          {
            role: "user",
            content: `حلل هذه الرسالة من واتساب:\n\nالمرسل: ${message.from_name || message.from_number}\nنوع الرسالة: ${message.message_type}\nالمحتوى: ${contentToAnalyze}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "فشل التحليل";

    let extractedData = {};
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) extractedData = JSON.parse(jsonMatch[0]);
    } catch {
      extractedData = { raw_analysis: aiText };
    }

    await supabase
      .from("whatsapp_messages")
      .update({
        ai_analysis: aiText,
        ai_summary: (extractedData as any).summary || aiText.slice(0, 200),
        extracted_data: extractedData,
        status: "analyzed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    return new Response(JSON.stringify({ success: true, analysis: extractedData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
