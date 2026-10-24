import { PublicFooter, PublicHeader } from "@/components/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <div className="relative flex-1">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div aria-hidden className="aurora aurora-light h-96 opacity-60" />
        <main id="main" className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
      <PublicFooter />
    </div>
  );
}
