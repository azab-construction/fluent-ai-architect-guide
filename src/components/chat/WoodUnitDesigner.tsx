import React, { useState, useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import { VRButton, ARButton, XR, Controllers, Hands } from '@react-three/xr';
import * as THREE from 'three';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Glasses, Download, RotateCcw, FileText } from 'lucide-react';
import { WoodUnitSpec, specToArabicSummary } from '@/lib/wood-unit-parser';
import { calcQuoteItems, totals } from '@/lib/quote-utils';
import { useToast } from '@/hooks/use-toast';

// --- Parametric 3D model ---
const WoodUnitModel: React.FC<{ spec: WoodUnitSpec }> = ({ spec }) => {
  const W = spec.width / 100;   // meters
  const H = spec.height / 100;
  const D = spec.depth / 100;
  const t = 0.018; // panel thickness 18mm

  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.finish === 'glossy' ? 0.15 : spec.finish === 'natural' ? 0.85 : 0.55,
      metalness: 0.05,
    });
    return m;
  }, [spec.color, spec.finish]);

  const knobMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a04c', metalness: 0.9, roughness: 0.2 }), []);

  // For tables/beds use different topology
  if (spec.kind === 'table' || spec.kind === 'desk') {
    const legH = H - t;
    return (
      <group position={[0, H / 2, 0]}>
        <mesh position={[0, H / 2 - t / 2, 0]} material={mat}>
          <boxGeometry args={[W, t, D]} />
        </mesh>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
          <mesh key={i} position={[x * (W / 2 - 0.04), -t / 2 - legH / 2 + t, z * (D / 2 - 0.04)]} material={mat}>
            <boxGeometry args={[0.06, legH, 0.06]} />
          </mesh>
        ))}
      </group>
    );
  }

  if (spec.kind === 'bed') {
    return (
      <group position={[0, H / 2, 0]}>
        <mesh position={[0, 0, 0]} material={mat}>
          <boxGeometry args={[W, H * 0.4, D]} />
        </mesh>
        <mesh position={[0, H * 0.6, -D / 2 + t]} material={mat}>
          <boxGeometry args={[W, H * 1.2, t]} />
        </mesh>
        <mesh position={[0, H * 0.25, 0]}>
          <boxGeometry args={[W - 0.05, 0.18, D - 0.05]} />
          <meshStandardMaterial color="#f5f0e8" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (spec.kind === 'door') {
    return (
      <group position={[0, H / 2, 0]}>
        <mesh material={mat}><boxGeometry args={[W, H, D]} /></mesh>
        <mesh position={[W / 2 - 0.06, 0, D / 2 + 0.01]} material={knobMat}>
          <sphereGeometry args={[0.025, 24, 24]} />
        </mesh>
      </group>
    );
  }

  // Wardrobe / Cabinet / Shelf - box with shelves, doors, drawers
  const doors = Math.max(0, spec.doors);
  const drawers = Math.max(0, spec.drawers);
  const drawerZoneH = drawers > 0 ? Math.min(H * 0.3, drawers * 0.18) : 0;
  const shelfZoneH = H - drawerZoneH - t * 2;
  const shelves = Math.max(0, spec.shelves);
  const doorW = doors > 0 ? W / doors : W;

  return (
    <group position={[0, H / 2, 0]}>
      {/* Back */}
      <mesh position={[0, 0, -D / 2 + t / 2]} material={mat}>
        <boxGeometry args={[W, H, t]} />
      </mesh>
      {/* Top */}
      <mesh position={[0, H / 2 - t / 2, 0]} material={mat}>
        <boxGeometry args={[W, t, D]} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -H / 2 + t / 2, 0]} material={mat}>
        <boxGeometry args={[W, t, D]} />
      </mesh>
      {/* Sides */}
      <mesh position={[-W / 2 + t / 2, 0, 0]} material={mat}>
        <boxGeometry args={[t, H, D]} />
      </mesh>
      <mesh position={[W / 2 - t / 2, 0, 0]} material={mat}>
        <boxGeometry args={[t, H, D]} />
      </mesh>

      {/* Shelves (in shelf zone) */}
      {Array.from({ length: shelves }).map((_, i) => {
        const y = -H / 2 + drawerZoneH + (shelfZoneH / (shelves + 1)) * (i + 1);
        return (
          <mesh key={`sh-${i}`} position={[0, y, 0]} material={mat}>
            <boxGeometry args={[W - t * 2, t, D - t * 2]} />
          </mesh>
        );
      })}

      {/* Drawers (front faces) */}
      {Array.from({ length: drawers }).map((_, i) => {
        const drawerH = drawerZoneH / drawers - 0.005;
        const y = -H / 2 + t + drawerH / 2 + (drawerZoneH / drawers) * i;
        return (
          <group key={`dr-${i}`} position={[0, y, D / 2 + t / 2]}>
            <mesh material={mat}>
              <boxGeometry args={[W - 0.01, drawerH, t]} />
            </mesh>
            <mesh position={[0, 0, t / 2 + 0.005]} material={knobMat}>
              <boxGeometry args={[0.12, 0.018, 0.018]} />
            </mesh>
          </group>
        );
      })}

      {/* Doors */}
      {Array.from({ length: doors }).map((_, i) => {
        const x = -W / 2 + doorW / 2 + i * doorW;
        const doorH = shelfZoneH - 0.005;
        const y = -H / 2 + drawerZoneH + doorH / 2;
        return (
          <group key={`dr2-${i}`} position={[x, y, D / 2 + t / 2]}>
            <mesh material={mat}>
              <boxGeometry args={[doorW - 0.008, doorH, t]} />
            </mesh>
            <mesh position={[doorW / 2 - 0.05, 0, t / 2 + 0.005]} material={knobMat}>
              <sphereGeometry args={[0.018, 16, 16]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const RoomEnvironment: React.FC = () => (
  <>
    {/* Floor */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#e8e2d6" roughness={0.9} />
    </mesh>
    {/* Back wall */}
    <mesh position={[0, 2, -3]} receiveShadow>
      <planeGeometry args={[20, 6]} />
      <meshStandardMaterial color="#f5f0e8" roughness={0.95} />
    </mesh>
  </>
);

interface Props {
  spec: WoodUnitSpec;
  onSpecChange: (s: WoodUnitSpec) => void;
  onClose?: () => void;
}

export const WoodUnitDesigner: React.FC<Props> = ({ spec, onSpecChange, onClose }) => {
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [pricePerM3, setPricePerM3] = useState(18000);
  const [vrMode, setVrMode] = useState(false);

  const items = useMemo(() => calcQuoteItems({
    unitType: spec.kind, woodType: spec.woodType,
    length: spec.width * 10, width: spec.depth * 10, thickness: 18,
  }, qty, pricePerM3), [spec, qty, pricePerM3]);
  const tot = totals(items);

  const update = (patch: Partial<WoodUnitSpec>) => onSpecChange({ ...spec, ...patch });

  const exportSpec = () => {
    const data = { spec, quote: { items, ...tot } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `wood-unit-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'تم تصدير التصميم وعرض السعر' });
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-amber-600 to-yellow-600">🪵 مصمم الوحدات الخشبية</Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">{specToArabicSummary(spec)}</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={exportSpec} className="gap-1">
            <Download className="w-3 h-3" /> تصدير
          </Button>
          {onClose && <Button size="sm" variant="ghost" onClick={onClose}>×</Button>}
        </div>
      </div>

      <div className="relative flex-1 min-h-[380px] bg-gradient-to-br from-slate-100 to-slate-300 dark:from-slate-900 dark:to-slate-700">
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          {/* VRButton/ARButton are portaled to body by @react-three/xr */}
          <div id="xr-buttons-host" />
        </div>
        <Canvas shadows camera={{ position: [2.2, 1.6, 2.4], fov: 50 }}>
          <XR>
            <Suspense fallback={<Html center><div className="text-sm">جارٍ التحميل...</div></Html>}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
              <Environment preset="apartment" />
              <RoomEnvironment />
              <WoodUnitModel spec={spec} />
              <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={10} blur={2} />
              <Controllers />
              <Hands />
            </Suspense>
            <OrbitControls makeDefault enableDamping target={[0, spec.height / 200, 0]} />
          </XR>
        </Canvas>
        <div className="absolute bottom-2 left-2 z-10">
          <VRButton className="!bg-primary !text-primary-foreground !px-3 !py-1.5 !rounded-md !text-xs !font-medium" />
        </div>
        <div className="absolute bottom-2 left-24 z-10">
          <ARButton className="!bg-secondary !text-secondary-foreground !px-3 !py-1.5 !rounded-md !text-xs !font-medium" />
        </div>
      </div>

      <Tabs defaultValue="dims" className="border-t">
        <TabsList className="w-full justify-start rounded-none h-9 px-2">
          <TabsTrigger value="dims" className="text-xs">المقاسات</TabsTrigger>
          <TabsTrigger value="parts" className="text-xs">المكونات</TabsTrigger>
          <TabsTrigger value="material" className="text-xs">المادة</TabsTrigger>
          <TabsTrigger value="quote" className="text-xs">عرض السعر</TabsTrigger>
        </TabsList>

        <TabsContent value="dims" className="p-3 space-y-3 max-h-56 overflow-auto">
          {(['width', 'height', 'depth'] as const).map(k => (
            <div key={k} className="space-y-1">
              <div className="flex justify-between text-xs">
                <Label>{k === 'width' ? 'العرض' : k === 'height' ? 'الارتفاع' : 'العمق'} (سم)</Label>
                <span className="font-mono">{spec[k]}</span>
              </div>
              <Slider value={[spec[k]]} min={20} max={300} step={1} onValueChange={([v]) => update({ [k]: v } as any)} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="parts" className="p-3 space-y-3 max-h-56 overflow-auto">
          {(['shelves', 'doors', 'drawers'] as const).map(k => (
            <div key={k} className="space-y-1">
              <div className="flex justify-between text-xs">
                <Label>{k === 'shelves' ? 'الأرفف' : k === 'doors' ? 'الأبواب' : 'الأدراج'}</Label>
                <span className="font-mono">{spec[k]}</span>
              </div>
              <Slider value={[spec[k]]} min={0} max={k === 'shelves' ? 10 : 6} step={1} onValueChange={([v]) => update({ [k]: v } as any)} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="material" className="p-3 space-y-3 max-h-56 overflow-auto">
          <div className="space-y-1">
            <Label className="text-xs">نوع الخشب</Label>
            <Select value={spec.woodType} onValueChange={(v: any) => update({ woodType: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="oak">بلوط (Oak)</SelectItem>
                <SelectItem value="walnut">جوز (Walnut)</SelectItem>
                <SelectItem value="beech">زان (Beech)</SelectItem>
                <SelectItem value="mahogany">ماهوجني</SelectItem>
                <SelectItem value="pine">صنوبر</SelectItem>
                <SelectItem value="mdf">MDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">التشطيب</Label>
            <Select value={spec.finish} onValueChange={(v: any) => update({ finish: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="matte">مطفي</SelectItem>
                <SelectItem value="glossy">لامع</SelectItem>
                <SelectItem value="natural">طبيعي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">اللون</Label>
            <input type="color" value={spec.color} onChange={(e) => update({ color: e.target.value })} className="w-full h-8 rounded border" />
          </div>
        </TabsContent>

        <TabsContent value="quote" className="p-3 space-y-2 max-h-56 overflow-auto">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">الكمية</Label>
              <input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value || 1)} className="w-full h-8 px-2 text-xs border rounded" />
            </div>
            <div>
              <Label className="text-xs">سعر م³ (ج.م)</Label>
              <input type="number" value={pricePerM3} onChange={e => setPricePerM3(+e.target.value || 0)} className="w-full h-8 px-2 text-xs border rounded" />
            </div>
          </div>
          <div className="text-xs space-y-1 mt-2 border-t pt-2">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="truncate">{it.description}</span>
                <span className="font-mono whitespace-nowrap">{it.total.toLocaleString()} ج.م</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1"><span>الإجمالي قبل الضريبة</span><span className="font-mono">{tot.subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>الضريبة 14%</span><span className="font-mono">{tot.tax.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-primary"><span>الإجمالي</span><span className="font-mono">{tot.total.toLocaleString()} ج.م</span></div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default WoodUnitDesigner;
