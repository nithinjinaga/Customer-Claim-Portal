import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/(public)/actions";
import { btnGhost } from "@/components/ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role === "CUSTOMER") redirect("/admin/login");
  return (
    <>
      <SiteHeader homeHref="/admin">
        <span className="rounded-full bg-pe-navy px-2.5 py-1 text-xs font-semibold text-white">
          {session.role === "ADMIN" ? "Admin" : "Agent"}
        </span>
        <span className="hidden text-sm text-muted sm:inline">{session.name}</span>
        <form action={logoutAction}>
          <button type="submit" className={btnGhost}>
            Logout
          </button>
        </form>
      </SiteHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  );
}
