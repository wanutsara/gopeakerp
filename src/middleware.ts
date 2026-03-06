import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Module } from "@/lib/rbac";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Public routes
        if (path === "/login" || path === "/ess/login") {
            return NextResponse.next();
        }

        if (!token) {
            if (path.startsWith("/ess")) {
                return NextResponse.redirect(new URL("/ess/login", req.url));
            } else {
                return NextResponse.redirect(new URL("/login", req.url));
            }
        }

        const role = token.role;
        const permissions = (token.permissions as any[]) || [];

        // OWNER bypasses all Workspace gates
        if (role === "OWNER") return NextResponse.next();

        // ESS Workspace is universally accessible for all authenticated employees
        if (path.startsWith("/ess") || path === "/") {
            return NextResponse.next();
        }

        // Map URL Route Prefix -> Enterprise Module Requirement
        let requiredModule: Module | null = null;

        if (path.startsWith("/settings") || path.startsWith("/hr/settings") || path === "/dashboard") {
            requiredModule = "EXECUTIVE";
        } else if (path.startsWith("/finance")) {
            requiredModule = "FINANCE";
        } else if (path.startsWith("/oms") || path.startsWith("/crm") || path.startsWith("/marketing")) {
            requiredModule = "OMS";
        } else if (path.startsWith("/hr")) {
            requiredModule = "HR";
        }

        // If a route doesn't map to a strict module, default to deny for non-Owners.
        // Or we can let it pass if it's an unmapped public dashboard route, but strict RBAC prefers deny.
        if (!requiredModule) {
            return NextResponse.redirect(new URL("/ess/dashboard", req.url));
        }

        // Check Dynamic Permission Matrix
        const hasAccess = permissions.some(p => p.module === requiredModule && p.canRead);

        if (!hasAccess) {
            // Unauthorized intrusion detected, redirect to their secure ESS workspace
            return NextResponse.redirect(new URL("/ess/dashboard", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: () => true, // Enforce middleware logic on every request
        },
    }
);

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
