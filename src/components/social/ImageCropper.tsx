import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const RATIOS: { label: string; value: number | "orig" }[] = [
  { label: "Original", value: "orig" },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:1", value: 3 },
];

async function crop(src: string, area: Area): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = area.width; c.height = area.height;
  c.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
}

export function ImageCropper({ file, open, onCancel, onDone, aspect, round }: {
  file: File | null; open: boolean; onCancel: () => void; onDone: (b: Blob, previewUrl: string) => void; aspect?: number; round?: boolean;
}) {
  const [src, setSrc] = useState<string>("");
  const [orig, setOrig] = useState(1);
  const [ratio, setRatio] = useState<number | "orig">(aspect ?? "orig");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setSrc(u); setZoom(1); setPos({ x: 0, y: 0 });
    const i = new Image(); i.onload = () => setOrig(i.width / i.height); i.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const a = aspect ?? (ratio === "orig" ? orig : ratio);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-2xl">Ajustar imagem</DialogTitle></DialogHeader>
        <div className="relative h-80 overflow-hidden rounded-lg bg-muted">
          {src && <Cropper image={src} crop={pos} zoom={zoom} aspect={a} cropShape={round ? "round" : "rect"} onCropChange={setPos} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />}
        </div>
        <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={(v) => setZoom(v[0])} />
        {!aspect && (
          <div className="flex flex-wrap gap-2">
            {RATIOS.map((r) => (
              <Button key={r.label} size="sm" variant={ratio === r.value ? "default" : "secondary"} onClick={() => setRatio(r.value)}>{r.label}</Button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={async () => { if (!area) return; const b = await crop(src, area); onDone(b, URL.createObjectURL(b)); }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
