"use client";

import Link from "next/link";
import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link
            href="/"
            className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md"
          >
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
            >
              <GoogleIcon />
              {t.login.google}
            </Button>
            <Button
              id="login-microsoft"
              variant="outline"
              className="w-full gap-2 font-medium"
            >
              <MicrosoftIcon />
              {t.login.microsoft}
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {t.login.orContinueWith}
            </span>
            <Separator className="flex-1" />
          </div>

          {/* Email */}
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-foreground"
              >
                {t.login.emailLabel}
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder={t.login.emailPlaceholder}
                autoComplete="email"
                className="h-10"
              />
            </div>
            <Button id="login-submit" type="submit" className="w-full font-semibold">
              {t.login.continueWithEmail}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.login.noAccount}{" "}
          <Link
            href="/signup"
            id="login-signup-link"
            className="font-medium text-primary hover:underline"
          >
            {t.login.signUp}
          </Link>
        </p>
      </div>
    </div>
  );
}
