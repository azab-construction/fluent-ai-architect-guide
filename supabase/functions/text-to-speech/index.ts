// Text-to-Speech via Lovable AI Gateway (OpenAI-compatible /v1/audio/speech)
// Body: { text: string, voice?: string, model?: string, format?: 'mp3'|'wav'|'opus'|'aac'|'flac' }
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

    const body = await req.json().catch(() => ({}));
    const { text, voice = 'alloy', model = 'openai/tts-1', format = 'mp3' } = body || {};

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Provider limits ~4096 chars per request
    if (text.length > 4000) {
      return new Response(JSON.stringify({ error: 'Text exceeds 4000 chars. Split into chunks.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, voice, input: text, response_format: format }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: 'TTS failed', status: resp.status, details: errText }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const audio = await resp.arrayBuffer();
    const mimeMap: Record<string, string> = {
      mp3: 'audio/mpeg', wav: 'audio/wav', opus: 'audio/ogg', aac: 'audio/aac', flac: 'audio/flac',
    };
    return new Response(audio, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': mimeMap[format] || 'audio/mpeg' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
