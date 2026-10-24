import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { jwks } from "@/lib/supabase/jwks";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components.
  // getClaims verifies the JWT locally, avoiding an Auth API round trip per request.
  const authStart = performance.now();
  const { data } = await supabase.auth.getClaims(undefined, { jwks });
  const user = data?.claims;
  const authTiming = `proxy-auth;dur=${(performance.now() - authStart).toFixed(1)}`;

  // Protect dashboard routes
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withTiming(NextResponse.redirect(url), authTiming);
  }

  // Signed-in users skip the sign-in homepage
  if (user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withTiming(NextResponse.redirect(url), authTiming);
  }

  return withTiming(supabaseResponse, authTiming);
}

// Exposes how long session verification took, visible in curl -D - and browser devtools
function withTiming(response: NextResponse, timing: string) {
  response.headers.append("Server-Timing", timing);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf)$).*)",
  ],
};
