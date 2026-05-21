import React, { useEffect, useRef, useState } from 'react';
import DxfParser from 'dxf-parser';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props { text: string; }

// Simple SVG-based DXF renderer (LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC)
export const DXFViewer: React.FC<Props> = ({ text }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [info, setInfo] = useState<{ layers: number; entities: number; bbox: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parser = new DxfParser();
      const dxf: any = parser.parseSync(text);
      if (!dxf) throw new Error('فشل تحليل DXF');

      const entities = dxf.entities || [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const paths: string[] = [];

      const upd = (x: number, y: number) => {
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      };

      for (const e of entities) {
        if (e.type === 'LINE' && e.vertices?.length >= 2) {
          const [a, b] = e.vertices;
          upd(a.x, a.y); upd(b.x, b.y);
          paths.push(`<line x1="${a.x}" y1="${-a.y}" x2="${b.x}" y2="${-b.y}" stroke="#f5bf23" stroke-width="0.5"/>`);
        } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices?.length) {
          const pts = e.vertices.map((v: any) => { upd(v.x, v.y); return `${v.x},${-v.y}`; }).join(' ');
          paths.push(`<polyline points="${pts}" fill="none" stroke="#f5bf23" stroke-width="0.5"/>`);
        } else if (e.type === 'CIRCLE') {
          upd(e.center.x - e.radius, e.center.y - e.radius);
          upd(e.center.x + e.radius, e.center.y + e.radius);
          paths.push(`<circle cx="${e.center.x}" cy="${-e.center.y}" r="${e.radius}" fill="none" stroke="#f5bf23" stroke-width="0.5"/>`);
        } else if (e.type === 'ARC') {
          const r = e.radius, c = e.center;
          const s = (e.startAngle * Math.PI) / 180, en = (e.endAngle * Math.PI) / 180;
          const x1 = c.x + r * Math.cos(s), y1 = c.y + r * Math.sin(s);
          const x2 = c.x + r * Math.cos(en), y2 = c.y + r * Math.sin(en);
          upd(c.x - r, c.y - r); upd(c.x + r, c.y + r);
          const large = en - s > Math.PI ? 1 : 0;
          paths.push(`<path d="M ${x1} ${-y1} A ${r} ${r} 0 ${large} 0 ${x2} ${-y2}" fill="none" stroke="#f5bf23" stroke-width="0.5"/>`);
        }
      }

      if (!isFinite(minX)) { minX = -10; minY = -10; maxX = 10; maxY = 10; }
      const w = maxX - minX, h = maxY - minY;
      const pad = Math.max(w, h) * 0.05 || 1;
      const vb = `${minX - pad} ${-maxY - pad} ${w + pad * 2} ${h + pad * 2}`;

      if (svgRef.current) {
        svgRef.current.setAttribute('viewBox', vb);
        svgRef.current.innerHTML = paths.join('');
      }
      setInfo({
        layers: Object.keys(dxf.tables?.layer?.layers || {}).length,
        entities: entities.length,
        bbox: { minX, minY, maxX, maxY, w, h },
      });
      setError(null);
    } catch (e: any) {
      setError(e.message || 'خطأ في تحليل DXF');
    }
  }, [text]);

  if (error) return <Card className="p-4 text-sm text-destructive">{error}</Card>;

  return (
    <div className="space-y-2">
      {info && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">طبقات: {info.layers}</Badge>
          <Badge variant="outline">كيانات: {info.entities}</Badge>
          <Badge variant="outline">العرض: {info.bbox.w.toFixed(2)}</Badge>
          <Badge variant="outline">الارتفاع: {info.bbox.h.toFixed(2)}</Badge>
        </div>
      )}
      <div className="w-full h-[500px] bg-slate-950 rounded-lg overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" preserveAspectRatio="xMidYMid meet" />
      </div>
      <p className="text-[10px] text-muted-foreground">
        ملاحظة: يدعم العارض ملفات DXF (LINE, POLYLINE, CIRCLE, ARC). لملفات DWG يلزم تحويلها إلى DXF أولاً.
      </p>
    </div>
  );
};

export default DXFViewer;
