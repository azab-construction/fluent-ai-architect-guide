import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

// Initialize once
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
  flowchart: { htmlLabels: true, useMaxWidth: true },
  gantt: { useMaxWidth: true },
  pie: { useMaxWidth: true } as any,
});

interface MermaidChartProps {
  chart: string;
  title?: string;
  className?: string;
}

export const MermaidChart: React.FC<MermaidChartProps> = ({ chart, title, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const id = `mermaid-${reactId.replace(/[:]/g, '')}`;
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!chart?.trim()) return;
      try {
        setError(null);
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'فشل عرض المخطط');
        // cleanup orphan node mermaid leaves in DOM
        document.querySelectorAll(`#d${id}`).forEach(n => n.remove());
      }
    };
    render();

    const onResize = () => render();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [chart, id]);

  return (
    <Card className={`p-4 ${className || ''}`} dir="ltr">
      {title && (
        <h3 className="text-sm font-semibold mb-3 text-foreground" dir="rtl">{title}</h3>
      )}
      {error ? (
        <div className="flex items-center gap-2 text-destructive text-sm p-4 bg-destructive/10 rounded-md" dir="rtl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>تعذّر عرض المخطط: {error}</span>
        </div>
      ) : (
        <div
          ref={ref}
          className="mermaid-container w-full overflow-x-auto flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </Card>
  );
};

export default MermaidChart;
