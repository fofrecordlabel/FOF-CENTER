import { NextResponse, type NextRequest } from "next/server";
import { deskToken } from "@/lib/gate";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/lock") {
    const headers = new Headers(request.headers);
    headers.set("x-desk-path", "/lock");
    return NextResponse.next({ request: { headers } });
  }
  const token = request.cookies.get("fof_desk")?.value;
  if (token && token === (await deskToken())) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/lock";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico|icon|apple-icon|apple-touch-icon|alerts.js|manifest.webmanifest).*)"],
};
