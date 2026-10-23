import { Droplet } from "lucide-react";
import { AnimatedMap } from "@/components/map/animated-map";

interface AuthShellProps {
  children: React.ReactNode;
}

/**
 * Signed-out layout: an auth panel beside a slowly orbiting satellite view
 * of the district. The map is skipped below lg so phones only load the form.
 */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-svh bg-background text-[13px] leading-snug text-foreground">
      <section
        aria-label="Sign in"
        className="flex w-full flex-col lg:w-[440px] lg:shrink-0 lg:border-r"
      >
        <header className="flex h-11 shrink-0 items-center gap-2 border-b px-5">
          <Droplet className="size-4 text-brand" strokeWidth={2.25} aria-hidden="true" />
          <span className="font-mono text-xs font-medium tracking-wide">RFD / WATER</span>
          <div className="flex-1" />
          <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
            RICHMOND, VT
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-14">
          <div className="w-full max-w-[360px]">{children}</div>
        </div>

        <footer className="flex items-center gap-4 border-t px-5 py-3 font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
          <span>AUTHORIZED OPERATORS ONLY</span>
        </footer>
      </section>

      <section
        aria-label="Satellite view of Richmond, Vermont"
        className="relative hidden min-w-0 flex-1 overflow-hidden bg-zinc-800 lg:block"
      >
        <div className="absolute inset-0">
          <AnimatedMap />
        </div>
      </section>
    </div>
  );
}
