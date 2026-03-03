import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Public routes that don't need auth checks here (already excluded by matcher, but just in case)
        if (path === "/login" || path === "/ess/login") {
            return NextResponse.next();
        }

        if (!token) {
            // Unauthenticated user trying to access protected route
            if (path.startsWith("/ess")) {
                return NextResponse.redirect(new URL("/ess/login", req.url));
            } else {
                return NextResponse.redirect(new URL("/login", req.url));
            }
        }

        // Authenticated users
        if (token) {
            // STAFF users are ONLY allowed in /ess
            if (token.role === "STAFF") {
                if (!path.startsWith("/ess")) {
                    return NextResponse.redirect(new URL("/ess/dashboard", req.url));
                }
            }
        }
    },
    {
        callbacks: {
            // Always return true so the middleware function above runs for EVERY route
            // We manually handle the unauthenticated redirects above.
            authorized: () => true,
        },
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
