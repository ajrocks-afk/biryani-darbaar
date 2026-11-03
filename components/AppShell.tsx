"use client";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const full = pathname.startsWith("/kitchen") || pathname.startsWith("/admin");
  if (full) return <>{children}</>;
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-md bg-cream text-ink shadow-2xl ring-1 ring-black/5">
      {children}
    </div>
    
  );
}