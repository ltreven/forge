"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useAuth, API_BASE } from "@/lib/auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Invalid email or password.");
        return;
      }

      login(data.data.token, data.data.user);
      toast.success("Welcome back!");
      router.replace("/setup");
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Cpu className="size-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.login.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.login.subtitle}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">

          {/* SSO buttons */}
          <div className="flex flex-col gap-3">
            <Button
              id="login-google"
              variant="outline"
              className="w-full gap-2 font-medium"
              onClick={() => toast.info(t.login.ssoComingSoon)}
              type="button"
            >
              <GoogleIcon />
              {t.login.google}
            </Button>
            <Button
              id="login-microsoft"
              variant="outline"
              className="w-full gap-2 font-medium"
              onClick={() => toast.info(t.login.ssoComingSoon)}
              type="button"
            >
              <MicrosoftIcon />
              {t.login.microsoft}
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">{t.login.orContinueWith}</span>
            <Separator className="flex-1" />
          </div>

          {/* Email + password */}
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                {t.login.emailLabel}
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.login.emailPlaceholder}
                autoComplete="email"
                required
                className="h-10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                {t.login.passwordLabel}
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  autoComplete="current-password"
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full font-semibold"
            >
              {isLoading ? "Signing in…" : t.login.signIn}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.login.noAccount}{" "}
          <Link href="/signup" id="login-signup-link" className="font-medium text-primary hover:underline">
            {t.login.signUp}
          </Link>
        </p>
      </div>
    </div>
  );
}
