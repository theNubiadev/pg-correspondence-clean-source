"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="size-4" aria-hidden="true" />
      Print this page
    </Button>
  );
}
