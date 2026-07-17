"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { getCroppedAvatarFile } from "@/lib/images/crop-image";
import { toast } from "sonner";

export function AvatarCropFullscreen({
  imageSrc,
  onCancel,
  onConfirm,
  busy = false,
}: {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
  busy?: boolean;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [exporting, setExporting] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const locked = busy || exporting;

  async function handleDone() {
    if (!croppedAreaPixels || locked) return;
    setExporting(true);
    try {
      const file = await getCroppedAvatarFile(
        imageSrc,
        croppedAreaPixels,
        rotation,
      );
      onConfirm(file);
    } catch {
      toast.error("Não foi possível recortar a foto. Tente outra imagem.");
      setExporting(false);
    }
  }

  const ui = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[#111]"
      role="dialog"
      aria-modal="true"
      aria-label="Centralizar foto"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[#1a1a1a] px-3 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          disabled={locked}
          onClick={onCancel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 disabled:opacity-50"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-base font-semibold text-white">
          Centralizar foto
        </h2>
      </header>

      <div className="relative min-h-0 flex-1 bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid
          objectFit="cover"
          minZoom={1}
          maxZoom={4}
          zoomWithScroll
          restrictPosition
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: "#000" },
            cropAreaStyle: {
              border: "2px solid rgba(255,255,255,0.95)",
              color: "rgba(0,0,0,0.55)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            },
          }}
        />
      </div>

      <footer className="shrink-0 border-t border-white/10 bg-[#1a1a1a] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <p className="mb-3 text-center text-xs text-white/60">
          Arraste a foto para centralizar · pinça para zoom
        </p>

        <div className="mb-4 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            disabled={locked}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[var(--action-red)] disabled:opacity-50"
            aria-label="Zoom"
          />
        </div>

        <div className="grid grid-cols-3 items-center gap-2">
          <button
            type="button"
            disabled={locked}
            onClick={onCancel}
            className="h-11 rounded-lg text-sm font-semibold tracking-wide text-white/90 hover:bg-white/10 disabled:opacity-50"
          >
            CANCELAR
          </button>

          <button
            type="button"
            disabled={locked}
            onClick={() => {
              setRotation((prev) => (prev + 90) % 360);
              setCrop({ x: 0, y: 0 });
            }}
            className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10 disabled:opacity-50"
            aria-label="Girar 90 graus"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            type="button"
            disabled={locked || !croppedAreaPixels}
            onClick={() => void handleDone()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--action-red)] text-sm font-semibold tracking-wide text-white hover:brightness-110 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {exporting || busy ? "…" : "PRONTO"}
          </button>
        </div>
      </footer>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(ui, document.body);
}
