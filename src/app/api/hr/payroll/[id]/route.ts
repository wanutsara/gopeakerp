import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "OWNER" && session.user.role !== "MANAGER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { status, otherIncome, bonus, deductions, socialSecurityDeduction, taxDeduction, lateDeduction } = body;

        const currentPayroll = await prisma.payroll.findUnique({ where: { id } });
        if (!currentPayroll) {
            return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
        }

        const dataToUpdate: any = {};
        if (status !== undefined) {
            if (status !== "UNPAID" && status !== "PAID") return NextResponse.json({ error: "Invalid status" }, { status: 400 });
            dataToUpdate.status = status;
        }

        // Support editing incomes and auto-recalculate net salary
        let newNetSalary = currentPayroll.netSalary;
        let needsRecalc = false;

        const finalOtherIncome = otherIncome ?? currentPayroll.otherIncome;
        const finalBonus = bonus ?? currentPayroll.bonus;
        const finalDeductions = deductions ?? currentPayroll.deductions;
        const finalSS = socialSecurityDeduction ?? currentPayroll.socialSecurityDeduction;
        const finalTax = taxDeduction ?? currentPayroll.taxDeduction;
        const finalLate = lateDeduction ?? currentPayroll.lateDeduction;

        if (otherIncome !== undefined || bonus !== undefined || deductions !== undefined ||
            socialSecurityDeduction !== undefined || taxDeduction !== undefined || lateDeduction !== undefined) {
            dataToUpdate.otherIncome = finalOtherIncome;
            dataToUpdate.bonus = finalBonus;
            dataToUpdate.deductions = finalDeductions;
            dataToUpdate.socialSecurityDeduction = finalSS;
            dataToUpdate.taxDeduction = finalTax;
            dataToUpdate.lateDeduction = finalLate;
            needsRecalc = true;
        }

        if (needsRecalc) {
            dataToUpdate.netSalary = currentPayroll.baseSalary + currentPayroll.otAmount + finalBonus + finalOtherIncome
                - finalDeductions - finalSS - finalTax - finalLate;
        }

        // We use a transaction so both records update atomically
        const result = await prisma.$transaction(async (tx) => {
            const updatedPayroll = await tx.payroll.update({
                where: { id },
                data: dataToUpdate,
                include: { employee: { select: { user: { select: { name: true } } } }, transaction: true }
            });

            if (dataToUpdate.status === "PAID" && currentPayroll.status !== "PAID") {
                if (!updatedPayroll.transaction) {
                    await tx.transaction.create({
                        data: {
                            type: "EXPENSE",
                            amount: updatedPayroll.netSalary,
                            amountTHB: updatedPayroll.netSalary,
                            category: "PAYROLL",
                            description: `[PAYROLL] เงินเดือนพนักงาน: ${updatedPayroll.employee.user.name || "Unknown"} (รอบ ${updatedPayroll.month})`,
                            payrollId: updatedPayroll.id,
                            date: new Date()
                        }
                    });
                }
            }
            return updatedPayroll;
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Payroll Update Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
