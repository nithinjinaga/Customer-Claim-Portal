import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader>
        <Link
          href="/"
          className="header-home inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-pe-navy transition-colors hover:text-pe-green focus:outline-none focus:ring-2 focus:ring-pe-blue/30"
        >
          Home
        </Link>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 has-[.hero]:max-w-none has-[.hero]:p-0">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
