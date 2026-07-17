import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getSession } from "@/lib/auth";
import { logoutAction } from "../(public)/actions";
import { btnGhost } from "@/components/ui";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <>
      <SiteHeader homeHref="/dashboard">
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
