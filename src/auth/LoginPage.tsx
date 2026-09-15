import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Scissors, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Input, FormField } from "@/components/Form";
import { Button } from "@/components/Button";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("aidev-usr1@raytcs.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-ink-950">
      <div className="hidden lg:flex flex-1 flex-col justify-between p-14 bg-[radial-gradient(circle_at_top_left,_#3a2f25,_#14100d)] text-cream-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold-400 text-ink-950 flex items-center justify-center">
            <Scissors size={22} strokeWidth={2.25} />
          </div>
          <div>
            <p className="font-display text-lg text-white">Priya UNISEX</p>
            <p className="text-xs tracking-widest uppercase text-gold-300">Beauty Care</p>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-4xl leading-tight text-white">
            Billing, beautifully <span className="text-gold-400">simplified.</span>
          </h2>
          <p className="mt-4 text-cream-200/70 text-sm leading-relaxed">
            The internal billing and management console for Priya UNISEX Beauty Care —
            fast POS checkout, employee performance, GST-ready invoices and complete
            business reporting in one place.
          </p>
        </div>
        <p className="text-xs text-cream-200/40">Internal use only · Owner &amp; Staff access</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-cream-100 p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gold-400 text-ink-950 flex items-center justify-center">
              <Scissors size={20} />
            </div>
            <p className="font-display text-lg text-ink-950">Priya UNISEX Beauty Care</p>
          </div>

          <h1 className="font-display text-2xl text-ink-950 mb-1">Welcome back</h1>
          <p className="text-sm text-ink-600 mb-8">Sign in with your salon account to continue.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@priyasalon.in"
                required
              />
            </FormField>
            <FormField label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </FormField>

            {error && (
              <p className="text-sm text-wine-600 bg-wine-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" size="lg" fullWidth disabled={isSubmitting} className="mt-2">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
              Sign In
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-cream-300 bg-white px-4 py-3.5 text-xs text-ink-600 leading-relaxed">
            <p className="font-semibold text-ink-800 mb-1">Demo credentials</p>
            <p>Owner — aidev-usr1@raytcs.com / owner123</p>
            <p>Employee — grisha@priyasalon.in / employee123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
