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
    <header className="bg-card border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={homeHref} className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Premier Energies"
            width={148}
            height={40}
            priority
          />
          <span className="hidden border-l border-line pl-3 text-sm font-medium tracking-wide text-muted sm:inline">
            Customer Service Portal
          </span>
        </Link>
        <nav className="flex items-center gap-3">{children}</nav>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-pe-blue via-pe-blue to-pe-green" />
    </header>
  );
}
