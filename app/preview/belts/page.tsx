import { readdir } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

async function listBeltImages(): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "belts");
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => f.endsWith(".png") || f.endsWith(".webp") || f.endsWith(".jpg"))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch {
    return [];
  }
}

export default async function PreviewBeltsPage() {
  const files = await listBeltImages();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl space-y-6 bg-[#0a0a0a] px-4 py-8 text-zinc-100">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-red-500">Preview</p>
        <h1 className="text-2xl font-bold">Faixas</h1>
        <p className="text-sm text-zinc-400">
          PNGs/WebP com fundo transparente — fundo escuro para conferir o
          recorte.
        </p>
      </header>

      {files.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">
          Nenhuma imagem em <code>public/belts</code> ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {files.map((file) => (
            <a
              key={file}
              href={`/belts/${file}`}
              target="_blank"
              rel="noreferrer"
              className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 text-center transition hover:border-zinc-600"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/belts/${file}`}
                alt={file}
                className="mx-auto h-28 w-28 object-contain bg-transparent"
              />
              <p className="truncate text-xs text-zinc-400">{file}</p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
