import { AuthGuard } from "@/components/auth-guard";
import { AppNavbar } from "@/components/app-navbar";

/**
 * Layout for the authenticated /setup section.
 * Uses its own navbar (AppNavbar) instead of the public one.
 * The root layout still renders <Navbar> — on /setup the public navbar
 * is visually superseded because AppNavbar is fixed and overlaps it.
 * We suppress the outer navbar by using "pt-0" on main and rendering
 * AppNavbar at the top of this layout.
 */
export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* The AppNavbar is fixed; it overwrites the public Navbar visually */}
      <AppNavbar />
      <div className="min-h-screen bg-muted/10 pt-16">
        {children}
      </div>
    </AuthGuard>
  );
}
