"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const data = await api.post("auth/login", { email, password });
      
      if (data && !data.error) {
        router.push("/dashboard");
        router.refresh();
      } else {
        alert("Invalid credentials check (user@example.com / password123)");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Encryption connection failed or server error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!email) {
      alert("Please enter your email first to find your Passkey");
      return;
    }
    setIsLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      
      // 1. Get options from server (Stealth)
      const options = await api.post("passkey/auth-options", { email });
      
      // 2. Start biometric prompt
      const asseResp = await startAuthentication({ optionsJSON: options });
      
      // 3. Verify with server (Stealth)
      const verification = await api.post("passkey/auth-verify", { 
        email, 
        body: asseResp 
      });

      if (verification && verification.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        alert("Passkey verification failed");
      }
    } catch (err) {
      console.error("Passkey Login error:", err);
      alert("Passkey login failed. Ensure you have registered a passkey on this device.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="glass p-8 rounded-3xl space-y-8 relative overflow-hidden">
          {/* Subtle line decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 mb-2">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Access Secure</h1>
            <p className="text-neutral-400 text-sm">Enter your credentials to continue to ModelPro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-neutral-600"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-neutral-600"
                  placeholder="••••••••"
                  required={!isLoading}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-400">
                <input type="checkbox" className="rounded-sm border-white/10 bg-white/5" />
                Remember me
              </label>
              <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : (
                  <>
                    Launch Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={isLoading}
                className="w-full border border-white/10 hover:bg-white/5 text-neutral-300 font-semibold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
                  <ShieldCheck size={14} className="text-emerald-400" />
                </div>
                Sign in with Passkey
              </button>
            </div>
          </form>

          <footer className="text-center pt-4">
            <p className="text-neutral-500 text-xs">
              Don&apos;t have an account? <Link href="/register" className="text-indigo-400 font-semibold underline underline-offset-4">Create account</Link>
            </p>
          </footer>
        </div>
        
        {/* Security badge */}
        <div className="mt-8 flex justify-center items-center gap-4 text-neutral-500">
          <div className="flex items-center gap-1.5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Stealth BFF Enabled</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">v1.2.0-secure</span>
        </div>
      </div>
    </main>
  );
}
