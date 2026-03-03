"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: '/ess/login' })}
            className="text-sm font-bold text-red-600 hover:text-red-800 transition px-3 py-1.5 rounded-lg active:bg-red-50"
        >
            ออกจากระบบ (Logout)
        </button>
    );
}
