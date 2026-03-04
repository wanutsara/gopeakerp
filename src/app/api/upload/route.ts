import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate a unique filename to prevent collisions
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.name);
        const filename = `${uniqueSuffix}${ext}`;

        const uploadDir = path.join(process.cwd(), "public", "uploads");
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        // Return the public URL
        const fileUrl = `/uploads/${filename}`;

        return NextResponse.json({ url: fileUrl, success: true });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }
}
