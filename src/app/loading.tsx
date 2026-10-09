import { Crest } from "@/components/brand/crest";

export default function RootLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3">
      <Crest className="size-10 opacity-80" />
      <p className="text-muted-foreground text-sm">Loading the register…</p>
    </div>
  );
}
