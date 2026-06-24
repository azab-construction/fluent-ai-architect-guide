// Speech-to-Text via Lovable AI Gateway (OpenAI-compatible)
// Accepts multipart/form-data with: file (audio blob), model (optional), language (optional)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const form = await req.formData();
    const file = form.get('file');
    const model = (form.get('model') as string) || 'openai/gpt-4o-mini-transcribe';
    const language = form.get('language') as string | null;

    if (!(file instanceof File) && !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'file is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // size guard 25 MiB
    const sizeBytes = (file as File).size ?? 0;
    if (sizeBytes > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File exceeds 25MB. Split it into chunks.' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Re-name file with proper extension based on MIME so OpenAI accepts it
    const f = file as File;
    const mime = (f.type || '').split(';')[0];
    const extMap: Record<string, string> = {
      'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
      'audio/ogg': 'ogg', 'audio/m4a': 'm4a', 'audio/aac': 'aac', 'audio/flac': 'flac',
    };
    const ext = extMap[mime] || (f.name?.split('.').pop() ?? 'webm');
    const renamed = new File([f], `audio.${ext}`, { type: mime || 'audio/webm' });

    const upstream = new FormData();
    upstream.append('model', model);
    upstream.append('file', renamed);
    if (language) upstream.append('language', language);

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstream,
    });

    const text = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'STT failed', status: resp.status, details: text }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Pass JSON through
    return new Response(text, {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
