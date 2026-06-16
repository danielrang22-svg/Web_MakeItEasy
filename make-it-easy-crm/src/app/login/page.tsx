"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "unauthorized") {
      setError("Tu cuenta no está autorizada. Contacta al administrador.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Error al iniciar sesión");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center px-6 font-[family-name:var(--font-inter)] relative overflow-hidden text-white">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#81ecff]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#ff59e3]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block">
            <img src="/logo.svg" alt="Make It Easy" className="h-12 mx-auto mb-4" />
            <p className="text-xs text-[#94A3B8] tracking-[0.3em] uppercase">
              Intelligent Automation
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#131313]/80 backdrop-blur-md rounded-3xl border border-[#484847]/20 p-8 md:p-10 shadow-2xl">
          <h2 className="text-xl font-bold mb-1">
            Iniciar Sesión
          </h2>
          <p className="text-sm text-[#adaaaa] mb-8">
            Ingresa tus credenciales para acceder al sistema
          </p>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#81ecff] mb-2 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@makeiteasycol.com"
                  required
                  suppressHydrationWarning
                  className="w-full px-4 py-4 bg-[#131313] border border-[#484847]/40 rounded-xl text-white placeholder:text-[#484847] focus:border-[#81ecff] focus:ring-1 focus:ring-[#81ecff] outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#81ecff] mb-2 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  suppressHydrationWarning
                  className="w-full px-4 py-4 bg-[#131313] border border-[#484847]/40 rounded-xl text-white placeholder:text-[#484847] focus:border-[#81ecff] focus:ring-1 focus:ring-[#81ecff] outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#81ecff] to-[#ff59e3] hover:opacity-90 text-[#0e0e0e] font-bold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(129,236,255,0.3)]"
            >
              {loading ? "Iniciando sesión..." : "Ingresar"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#484847] mt-8 uppercase tracking-widest font-bold">
          Make It Easy © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#81ecff] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
