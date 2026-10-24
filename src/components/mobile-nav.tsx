"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./nav";

export function MobileNav({ showAdmin }: { showAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="rounded-lg p-2 text-navy-900 hover:bg-navy-50"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="fixed inset-x-0 top-14 z-40 max-h-[calc(100vh-3.5rem)] overflow-y-auto bg-navy-950 p-3 shadow-xl">
          <NavLinks showAdmin={showAdmin} onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </div>
  );
}
