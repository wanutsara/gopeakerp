import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Tamaya ERP - ระบบบริหารจัดการ",
  description: "ระบบบริหารธุรกิจ (ERP) สำหรับร้าน Tamaya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`antialiased bg-gray-50 text-gray-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
