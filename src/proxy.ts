import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("pe_session")?.value;
  const session = token ? await verifyToken(token) : null;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || session.role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
