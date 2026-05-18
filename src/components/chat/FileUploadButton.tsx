import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ParsedFile, isFileSupported, parseFile } from '@/lib/file-parser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff'];
const fileToBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = rej;
  r.readAsDataURL(f);
});

interface FileUploadButtonProps {
  attachedFile: ParsedFile | null;
  onFileAttached: (file: ParsedFile | null) => void;
  isLoading: boolean;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  attachedFile,
  onFileAttached,
  isLoading,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = React.useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = IMAGE_EXTS.includes(ext) || file.type.startsWith('image/');

    if (!isImage && !isFileSupported(file)) {
      toast({
        title: 'نوع ملف غير مدعوم',
        description: 'الأنواع المدعومة: PDF, TXT, DOCX, صور (OCR)',
        variant: 'destructive',
      });
      return;
    }

    setParsing(true);
    try {
      let parsed: ParsedFile;
      if (isImage) {
        const base64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke('azure-vision', {
          body: { imageBase64: base64, features: 'read,caption' },
        });
        if (error) throw error;
        const text = (data?.caption ? `[وصف: ${data.caption}]\n\n` : '') + (data?.text || '');
        parsed = { name: file.name, type: ext, content: text || 'لم يتم استخراج نص.', size: file.size };
      } else {
        parsed = await parseFile(file);
      }
      onFileAttached(parsed);
      toast({
        title: 'تم تحميل الملف',
        description: `${parsed.name} (${(parsed.size / 1024).toFixed(1)} كيلوبايت)`,
      });
    } catch (err) {
      toast({
        title: 'خطأ في قراءة الملف',
        description: err instanceof Error ? err.message : 'خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.docx,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff,image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isLoading || parsing}
      />

      {attachedFile ? (
        <Badge variant="secondary" className="gap-1 py-1 px-2 text-xs max-w-[200px]">
          <FileText className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{attachedFile.name}</span>
          <button
            onClick={() => onFileAttached(null)}
            className="ml-1 hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || parsing}
          title="إرفاق ملف (PDF, TXT, DOCX, صور)"
        >
          {parsing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
};
