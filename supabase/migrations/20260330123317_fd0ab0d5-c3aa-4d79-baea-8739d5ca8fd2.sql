
-- Create table for WhatsApp messages and files
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_message_id TEXT UNIQUE,
  from_number TEXT NOT NULL,
  from_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  text_content TEXT,
  media_id TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  media_filename TEXT,
  media_size INTEGER,
  ai_analysis TEXT,
  ai_summary TEXT,
  extracted_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to read/write (service role)
CREATE POLICY "Service role full access" ON public.whatsapp_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_whatsapp_messages_from ON public.whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_type ON public.whatsapp_messages(message_type);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);

-- Storage bucket for WhatsApp media files
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true);

CREATE POLICY "WhatsApp media publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'whatsapp-media');
