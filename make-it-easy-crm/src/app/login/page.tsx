"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
                  className="w-full px-4 py-4 bg-[#131313] border border-[#484847]/40 rounded-xl text-white placeholder:text-[#484847] focus:border-[#81ecff] focus:ring-1 focus:ring-[#81ecff] outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[#ff6e84] text-sm bg-[#ff6e84]/10 px-4 py-3 rounded-xl border border-[#ff6e84]/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#81ecff] to-[#ff59e3] text-[#0e0e0e] font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:shadow-[0_0_20px_rgba(129,236,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
