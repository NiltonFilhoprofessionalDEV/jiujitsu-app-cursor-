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
    <main className="mx-auto min-h-dvh max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Preview</p>
        <h1 className="text-2xl font-bold text-foreground">Faixas</h1>
        <p className="text-sm text-muted-foreground">
          Página pública para ver as imagens sem `.env.local`.
        </p>
      </header>

      {files.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
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
              className="space-y-2 rounded-2xl border border-border bg-card p-3 text-center shadow-sm transition hover:bg-muted/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/belts/${file}`}
                alt={file}
                className="mx-auto h-28 w-28 object-contain"
              />
              <p className="truncate text-xs text-muted-foreground">{file}</p>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
