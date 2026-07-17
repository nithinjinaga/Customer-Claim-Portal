import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { btnPrimary } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <>
      <SiteHeader>
        <Link href="/track" className="text-sm font-medium text-muted hover:text-pe-blue">
          Track Complaint
        </Link>
        {session ? (
          <Link
            href={session.role === "CUSTOMER" ? "/dashboard" : "/admin"}
            className={btnPrimary}
          >
            My Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-muted hover:text-pe-blue">
              Login
            </Link>
            <Link href="/register" className={btnPrimary}>
              Register
            </Link>
          </>
        )}
      </SiteHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
      <SiteFooter />
    </>
  );
}
