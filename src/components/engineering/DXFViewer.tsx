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

      const num = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : NaN;
      };

      for (const e of entities) {
        if (e.type === 'LINE' && e.vertices?.length >= 2) {
          const ax = num(e.vertices[0].x), ay = num(e.vertices[0].y);
          const bx = num(e.vertices[1].x), by = num(e.vertices[1].y);
          if ([ax, ay, bx, by].some(Number.isNaN)) continue;
          upd(ax, ay); upd(bx, by);
          paths.push(`<line x1="${ax}" y1="${-ay}" x2="${bx}" y2="${-by}" stroke="#f5bf23" stroke-width="0.5"/>`);
        } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices?.length) {
          const coords = e.vertices.map((v: any) => [num(v.x), num(v.y)]);
          if (coords.some(([x, y]: number[]) => Number.isNaN(x) || Number.isNaN(y))) continue;
          coords.forEach(([x, y]: number[]) => upd(x, y));
          const pts = coords.map(([x, y]: number[]) => `${x},${-y}`).join(' ');
          paths.push(`<polyline points="${pts}" fill="none" stroke="#f5bf23" stroke-width="0.5"/>`);
        } else if (e.type === 'CIRCLE') {
          const cx = num(e.center?.x), cy = num(e.center?.y), r = num(e.radius);
          if ([cx, cy, r].some(Number.isNaN)) continue;
          upd(cx - r, cy - r);
          upd(cx + r, cy + r);
          paths.push(`<circle cx="${cx}" cy="${-cy}" r="${r}" fill="none" stroke="#f5bf23" stroke-width="0.5"/>`);
        } else if (e.type === 'ARC') {
          const r = num(e.radius), cx = num(e.center?.x), cy = num(e.center?.y);
          const sa = num(e.startAngle), ea = num(e.endAngle);
          if ([r, cx, cy, sa, ea].some(Number.isNaN)) continue;
          const s = (sa * Math.PI) / 180, en = (ea * Math.PI) / 180;
          const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
          const x2 = cx + r * Math.cos(en), y2 = cy + r * Math.sin(en);
          upd(cx - r, cy - r); upd(cx + r, cy + r);
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
