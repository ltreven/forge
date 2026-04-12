"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangSwitcher } from "@/components/lang-switcher";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: t.nav.about, href: "#about" },
    { label: t.nav.contactSales, href: "#contact" },
    { label: t.nav.pricing, href: "#pricing" },
  ];

  return (
    <header
      id="main-navbar"
      className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          id="nav-logo"
          className="flex items-center gap-2 font-bold text-foreground transition-opacity hover:opacity-80"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cpu className="size-4" />
          </span>
          <span className="text-lg tracking-tight">FORGE</span>
        </Link>

        {/* Desktop Nav Links (left side of bar) */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              id={`nav-link-${link.href.replace("#", "")}`}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden items-center gap-1 md:flex">
          <LangSwitcher />
          <Link href="/login" id="nav-login">
            <Button variant="ghost" size="sm" className="font-medium">
              {t.nav.login}
            </Button>
          </Link>
          <Link href="/signup" id="nav-get-started">
            <Button size="sm" className="font-semibold shadow-sm">
              {t.nav.getStarted}
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          id="nav-mobile-toggle"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "overflow-hidden border-t border-border/40 bg-background transition-all duration-300 md:hidden",
          mobileOpen ? "max-h-80" : "max-h-0"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-3">
            <LangSwitcher />
            <Link href="/login" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full">
                {t.nav.login}
              </Button>
            </Link>
            <Link href="/signup" className="flex-1">
              <Button size="sm" className="w-full font-semibold">
                {t.nav.getStarted}
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
