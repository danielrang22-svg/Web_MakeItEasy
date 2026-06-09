"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "unauthorized") {
      setError("Tu cuenta no está autorizada. Contacta al administrador.");
    } else if (err === "oauth_denied") {
      setError("Inicio de sesión con Google cancelado.");
    } else if (err === "config_error") {
      setError("Error de configuración de Google OAuth.");
    } else if (err === "token_error" || err === "userinfo_error" || err === "server_error") {
      setError("Error al verificar tu cuenta con Google. Intenta de nuevo.");
    } else if (err === "no_email") {
      setError("No se pudo obtener tu correo de Google.");
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

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError("");
    window.location.href = "/api/auth/google";
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

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-100 text-[#0e0e0e] font-semibold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#484847]/40" />
            <span className="text-xs text-[#adaaaa] font-medium">o</span>
            <div className="flex-1 h-px bg-[#484847]/40" />
          </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
