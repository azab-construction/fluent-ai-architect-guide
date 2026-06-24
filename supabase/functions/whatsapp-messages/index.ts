import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify JWT
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
  const { data: claims, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsError || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "50")), 100);
    const type = url.searchParams.get("type");
    const rawSearch = url.searchParams.get("search") || "";
    // Sanitize search: strip PostgREST OR operators and limit length
    const search = rawSearch.replace(/[,()*]/g, "").slice(0, 100);
    const offset = (page - 1) * limit;

    const ALLOWED_TYPES = ["text", "image", "video", "audio", "document", "sticker", "location", "contacts"];
    let query = supabase
      .from("whatsapp_messages")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== "all" && ALLOWED_TYPES.includes(type)) {
      query = query.eq("message_type", type);
    }

    if (search) {
      query = query.or(
        `text_content.ilike.%${search}%,from_name.ilike.%${search}%,from_number.ilike.%${search}%,ai_summary.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Query error: ${error.message}`);

    return new Response(
      JSON.stringify({
        messages: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Messages fetch error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch messages" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
