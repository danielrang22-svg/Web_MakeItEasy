import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-6xl font-bold text-mie-secondary">404</h1>
      <p className="text-xl text-muted-foreground">
        Esta página no existe o ha sido actualizada.
      </p>
      <p className="text-sm text-muted-foreground">
        Si ves este error después de un despliegue, haz <kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl + Shift + R</kbd> para refrescar.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-mie-secondary px-6 py-2 text-white transition hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
