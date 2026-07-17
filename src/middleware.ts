import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("pe_session")?.value;
  const session = token ? await verifyToken(token) : null;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || session.role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  } else if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
