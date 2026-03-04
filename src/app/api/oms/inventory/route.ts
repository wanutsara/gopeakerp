import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { productId, action, amount, countedQuantity, notes, reference } = body;

        if (!productId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // We must ensure this operation is atomic to prevent race conditions.
        // Prisma's $transaction guarantees stock integrity.
        const result = await prisma.$transaction(async (tx) => {
            // Read target product with a row lock by updating it momentarily or just read it.
            // A simple findUnique works since we use `increment/decrement` math directly.
            const product = await tx.product.findUnique({
                where: { id: productId }
            });

            if (!product) {
                throw new Error("Product not found");
            }

            let type: "INBOUND" | "ADJUSTMENT" | "OUTBOUND" = "ADJUSTMENT";
            let qtyChange = 0;
            let logNotes = notes || "";

            if (action === "INBOUND_RECEIVE") {
                if (!amount || amount <= 0) throw new Error("Invalid inbound amount");
                type = "INBOUND";
                qtyChange = amount;
                logNotes = logNotes || "Manual Stock Receive";

            } else if (action === "MANUAL_DEDUCTION") {
                if (!amount || amount <= 0) throw new Error("Invalid deduction amount");
                type = "OUTBOUND";
                qtyChange = -Math.abs(amount);
                logNotes = logNotes || "Manual Stock Deduction";

            } else if (action === "CYCLE_COUNT") {
                if (countedQuantity === undefined || countedQuantity < 0) throw new Error("Invalid counted quantity");
                type = "ADJUSTMENT";
                qtyChange = countedQuantity - product.stock;

                // If the count is perfectly matched, no movement is needed, but we can still write an audit log
                if (qtyChange === 0) {
                    logNotes = logNotes || "Cycle count matched expected stock perfectly.";
                } else {
                    logNotes = logNotes || `Smart Cycle Count: Diff ${qtyChange > 0 ? '+' : ''}${qtyChange}`;
                }
            } else {
                throw new Error("Invalid inventory action");
            }

            // Apply stock change using atomic increment
            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: {
                    stock: { increment: qtyChange }
                }
            });

            // Write Immutable Ledger Entry
            const ledgerEntry = await tx.inventoryLog.create({
                data: {
                    productId,
                    type,
                    quantityChanged: qtyChange,
                    balanceAfter: updatedProduct.stock,
                    reference: reference || null,
                    notes: logNotes,
                    createdBy: session.user.name || session.user.email || "Unknown User"
                }
            });

            return { product: updatedProduct, log: ledgerEntry };
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error("Inventory Transaction Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");

        if (!productId) {
            return NextResponse.json({ error: "productId is required" }, { status: 400 });
        }

        const logs = await prisma.inventoryLog.findMany({
            where: { productId },
            orderBy: { createdAt: "desc" },
            // Limit to last 100 for performance
            take: 100
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Failed to fetch inventory logs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
