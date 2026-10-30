import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: real session validation and authorization happen
// server-side in layouts, pages, actions and route handlers.
const PROTECTED = ["/dashboard", "/onboarding", "/exams", "/plan", "/learn", "/practice", "/attempt", "/mocks", "/tutor", "/formulas", "/flashcards", "/analytics", "/notes", "/settings", "/admin", "/notifications", "/groups", "/past-papers", "/guide", "/materials", "/videos", "/get-app", "/glossary", "/focus", "/daily", "/rapid-fire"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.has("finprep_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
