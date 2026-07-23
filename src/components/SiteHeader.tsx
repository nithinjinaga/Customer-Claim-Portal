import Image from "next/image";
import Link from "next/link";

export default function SiteHeader({
  homeHref = "/",
  children,
}: {
  homeHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={homeHref} className="flex items-center gap-3.5">
          <Image
            src="/logo.png"
            alt="Premier Energies"
            width={148}
            height={40}
            priority
          />
          <span className="hidden border-l border-line pl-3.5 text-base font-semibold uppercase tracking-wide text-muted sm:inline">
            Customer Service Portal<span className="text-pe-green"> · Solar Modules</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">{children}</nav>
      </div>
    </header>
  );
}
