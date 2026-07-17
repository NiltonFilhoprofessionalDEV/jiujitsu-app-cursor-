import type { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

function toRad(degree: number) {
  return (degree * Math.PI) / 180;
}

function rotatedBounds(width: number, height: number, rotation: number) {
  const rad = toRad(rotation);
  return {
    width:
      Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height:
      Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/** Renders the cropped region to a JPEG File (square avatar). */
export async function getCroppedAvatarFile(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  fileName = "avatar.jpg",
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível");

  const bounds = rotatedBounds(image.width, image.height, rotation);
  canvas.width = Math.max(1, Math.round(bounds.width));
  canvas.height = Math.max(1, Math.round(bounds.height));

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(toRad(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const output = document.createElement("canvas");
  const outCtx = output.getContext("2d");
  if (!outCtx) throw new Error("Canvas não disponível");

  const sourceSize = Math.max(
    1,
    Math.round(Math.min(pixelCrop.width, pixelCrop.height)),
  );
  const size = Math.min(sourceSize, 1024);
  output.width = size;
  output.height = size;
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    output.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Falha ao gerar a imagem"));
          return;
        }
        resolve(result);
      },
      "image/jpeg",
      0.9,
    );
  });

  return new File([blob], fileName, { type: "image/jpeg" });
}
