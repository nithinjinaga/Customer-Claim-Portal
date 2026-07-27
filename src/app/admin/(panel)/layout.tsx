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
        <span className="hidden text-sm font-bold text-ink sm:inline">{session.name}</span>
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
