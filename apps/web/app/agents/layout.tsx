import { AuthGuard } from "@/components/auth-guard";
import { AppNavbar } from "@/components/app-navbar";

/**
 * Layout for the authenticated /agents section.
 * Mirrors the /setup layout — uses AppNavbar (fixed) over the public navbar.
 */
export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppNavbar />
      <div className="min-h-screen bg-muted/10 pt-16">
        {children}
      </div>
    </AuthGuard>
  );
}
