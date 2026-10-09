import { Crest } from "@/components/brand/crest";
import { ICT_SUPPORT_EMAIL, ICT_SUPPORT_LABEL } from "@/lib/academic";
import { ORG_MOTTO, ORG_NAME, ORG_SHORT_NAME } from "@/lib/constants";

function IdentityMark() {
  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0 rounded-lg bg-white p-1.5">
        <Crest size="md" className="h-16 w-auto" priority />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-tight tracking-tight lg:text-2xl">
          {ORG_SHORT_NAME}
        </p>
        <p className="text-primary-foreground/75 mt-1 text-base leading-snug lg:text-lg">
          University of Ibadan
        </p>
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-svh flex-col md:flex-row">
      <aside
        className="bg-primary text-primary-foreground hidden min-h-svh w-[40%] flex-col justify-between px-8 py-10 md:flex lg:px-10 lg:py-12"
        aria-label="Institution"
      >
        <div>
          <IdentityMark />
          <p className="mt-14 max-w-md text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            Correspondence register
          </p>
          <p className="text-primary-foreground/75 mt-4 max-w-md text-lg leading-relaxed lg:text-xl">
            Official staff access.
          </p>
        </div>

        <p className="text-primary-foreground/40 text-xs italic">{ORG_MOTTO}</p>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col">
        <header className="bg-primary text-primary-foreground md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="shrink-0 rounded-md bg-white p-1">
              <Crest size="sm" className="h-9 w-auto" priority />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {ORG_SHORT_NAME}
              </p>
              <p className="text-primary-foreground/70 text-xs leading-snug">
                University of Ibadan · Correspondence register
              </p>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[24rem]">
            {children}

            <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
              {ORG_NAME}
              <br />
              For access, contact{" "}
              <a
                href={`mailto:${ICT_SUPPORT_EMAIL}`}
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                {ICT_SUPPORT_LABEL}
              </a>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
