import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const privilegedEnv = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
const allowedPath = /^[A-Za-z0-9@._+\-\/]+$/;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const privilegedKey = Deno.env.get(privilegedEnv)!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

  const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
    _user_id: claims.claims.sub,
    _role: "admin",
  });
  if (roleError || !isAdmin) return json({ error: "Forbidden" }, 403);

  const { path, expiresIn = 3600 } = await req.json().catch(() => ({}));
  if (!path || typeof path !== "string" || path.length > 512 || path.includes("..") || !allowedPath.test(path)) {
    return json({ error: "Invalid media path" }, 400);
  }

  const ttl = Math.min(Math.max(Number(expiresIn) || 3600, 60), 3600);
  const adminClient = createClient(supabaseUrl, privilegedKey);
  const { data, error } = await adminClient.storage.from("whatsapp-media").createSignedUrl(path, ttl);
  if (error || !data?.signedUrl) return json({ error: error?.message || "Failed to create signed URL" }, 500);

  return json({ signedUrl: data.signedUrl, expiresIn: ttl });
});
