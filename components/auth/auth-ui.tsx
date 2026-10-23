export function AuthHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-1 flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
        {eyebrow}
      </span>
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="text-zinc-600">{description}</p>
    </div>
  );
}

export function AuthLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-[10px] tracking-[0.08em] text-zinc-600"
    >
      {children}
    </label>
  );
}

export function AuthNotice({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          : "rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
      }
    >
      {children}
    </div>
  );
}

export const authInputClass =
  "h-[34px] w-full rounded-sm border border-zinc-300 bg-background px-2.5 text-[13px] outline-none placeholder:text-zinc-400 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-60";

export const authPrimaryButtonClass =
  "flex h-9 w-full items-center justify-center gap-2 rounded-sm bg-primary font-medium text-primary-foreground transition-colors hover:bg-zinc-800 disabled:opacity-60";

export function EnterHint() {
  return (
    <span
      aria-hidden="true"
      className="rounded-[3px] border border-zinc-700 px-1 font-mono text-[10px] text-zinc-400"
    >
      ↵
    </span>
  );
}
