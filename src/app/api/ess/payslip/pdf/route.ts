import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(request.url);
        const payrollId = searchParams.get('payrollId');

        if (!payrollId) {
            return new NextResponse("Payroll ID is required", { status: 400 });
        }

        const employee = await prisma.employee.findFirst({
            where: { user: { email: session.user.email! } },
            include: { companyBrand: true, user: true }
        });

        if (!employee) {
            return new NextResponse("Employee profile not found", { status: 404 });
        }

        const slip = await prisma.payroll.findFirst({
            where: {
                id: payrollId,
                employeeId: employee.id // Security check
            }
        });

        if (!slip) {
            return new NextResponse("Payslip record not found or inaccessible", { status: 404 });
        }

        // Format currency helper
        const formatThb = (amount: number) =>
            new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);

        const brand = employee.companyBrand;
        const legalName = brand?.legalName || 'N/A';
        const address = brand?.registeredAddress || 'N/A';
        const taxId = brand?.taxId ? `เลขประจำตัวผู้เสียภาษี: ${brand.taxId}` : '';
        const logo = brand?.logoUrl ? `<img src="${brand.logoUrl}" alt="Logo" style="max-height: 50px;" />` : `<h2 style="margin:0;">${brand?.name || 'Company'}</h2>`;

        const monthMap: Record<string, string> = {
            '01': 'มกราคม', '02': 'กุมภาพันธ์', '03': 'มีนาคม', '04': 'เมษายน',
            '05': 'พฤษภาคม', '06': 'มิถุนายน', '07': 'กรกฎาคม', '08': 'สิงหาคม',
            '09': 'กันยายน', '10': 'ตุลาคม', '11': 'พฤศจิกายน', '12': 'ธันวาคม'
        };

        const [year, month] = slip.month.split('-');
        const monthThai = `${monthMap[month]} ${parseInt(year) + 543}`;

        // Build HTML template infused with A4 CSS specs
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>Payslip_${slip.month}_${employee.user?.name || 'Employee'}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
                
                body {
                    font-family: 'Sarabun', sans-serif;
                    background: #f1f5f9;
                    margin: 0;
                    padding: 0px;
                    display: flex;
                    justify-content: center;
                }
                .a4-container {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    background: white;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    margin: 20px auto;
                    box-sizing: border-box;
                }
                .header-flex {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #1e293b;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .company-info p {
                    margin: 2px 0;
                    font-size: 14px;
                    color: #475569;
                }
                .doc-title {
                    text-align: right;
                }
                .doc-title h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #0f172a;
                    text-transform: uppercase;
                }
                .doc-title p {
                    margin: 5px 0 0 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #3b82f6;
                }
                .employee-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 30px;
                    padding: 15px;
                    background: #f8fafc;
                    border-radius: 8px;
                }
                .employee-grid p {
                    margin: 0;
                    font-size: 15px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                th, td {
                    border: 1px solid #cbd5e1;
                    padding: 12px;
                    font-size: 15px;
                }
                th {
                    background-color: #f1f5f9;
                    font-weight: 700;
                    color: #1e293b;
                    border-bottom: 2px solid #94a3b8;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .summary-table {
                    width: 50%;
                    margin-left: auto;
                    border: 2px solid #1e293b;
                }
                .summary-table th { background: #1e293b; color: white; border-color: #1e293b; }
                
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #64748b;
                    border-top: 1px dashed #cbd5e1;
                    padding-top: 20px;
                }

                @media print {
                    body { background: white; margin: 0; }
                    .a4-container { width: 100%; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
                }
            </style>
        </head>
        <body onload="window.print()">
            <div class="a4-container">
                <div class="header-flex">
                    <div class="company-info">
                        ${logo}
                        <h3 style="margin: 10px 0 5px 0; color: #1e293b;">${legalName}</h3>
                        <p>${address}</p>
                        <p>${taxId}</p>
                    </div>
                    <div class="doc-title">
                        <h1>ใบรับรองเงินเดือน <br><span style="font-size: 16px;">(PAYSLIP)</span></h1>
                        <p>ประจำเดือน: ${monthThai}</p>
                    </div>
                </div>

                <div class="employee-grid">
                    <div>
                        <p><strong>รหัสพนักงาน:</strong> EMP-${employee.id.substring(employee.id.length - 6).toUpperCase()}</p>
                        <p><strong>ชื่อ-สกุล:</strong> ${employee.user?.name || 'Employee'}</p>
                    </div>
                    <div>
                        <p><strong>ตำแหน่ง:</strong> ${employee.position || '-'}</p>
                        <p><strong>สังกัด/แผนก:</strong> ${employee.departmentId || 'สนญ.'}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 50%;">รายการรับ (Earnings)</th>
                            <th class="text-right" style="width: 25%;">จำนวนเงิน (THB)</th>
                            <th style="width: 25%;" colspan="2">รายการหัก (Deductions)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>เงินเดือนพื้นฐาน (Base Salary)</td>
                            <td class="text-right">${slip.baseSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            <td style="border-right: none;">ภาษีหัก ณ ที่จ่าย (Tax)</td>
                            <td class="text-right" style="border-left: none;">${slip.taxDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td>ค่าล่วงเวลา (OT)</td>
                            <td class="text-right">${slip.otAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            <td style="border-right: none;">ประกันสังคม (SSO)</td>
                            <td class="text-right" style="border-left: none;">${slip.socialSecurityDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td>เงินโบนัส (Bonus)</td>
                            <td class="text-right">${slip.bonus.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            <td style="border-right: none;">หักขาด/สาย (Leave/Late)</td>
                            <td class="text-right" style="border-left: none;">${(slip.deductions + slip.lateDeduction).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td>รายได้อื่นๆ (Other Income)</td>
                            <td class="text-right">${slip.otherIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            <td style="border-right: none;"></td>
                            <td class="text-right" style="border-left: none;"></td>
                        </tr>
                        <tr style="font-weight: bold; background: #f8fafc;">
                            <td class="text-right">รวมรับ</td>
                            <td class="text-right" style="color: #16a34a;">${(slip.baseSalary + slip.otAmount + slip.bonus + slip.otherIncome).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            <td class="text-right" style="border-right: none;">รวมหัก</td>
                            <td class="text-right" style="color: #ef4444; border-left: none;">${(slip.taxDeduction + slip.socialSecurityDeduction + slip.deductions + slip.lateDeduction).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>

                <table class="summary-table">
                    <thead>
                        <tr>
                            <th colspan="2" class="text-center">สรุปรายได้สุทธิ (Net Pay)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-size: 24px; font-weight: bold; padding: 20px;" class="text-center text-emerald-600">
                                ${formatThb(slip.netSalary)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    เอกสารฉบับนี้ถูกสร้างและรับรองโดยระบบอัตโนมัติขององค์กร (Electronic Generated Document)<br>
                    ${legalName} เข้าร่วมโครงการจัดทำเอกสารอิเล็กทรอนิกส์
                </div>
            </div>
        </body>
        </html>
        `;

        const fileName = `Payslip_${slip.month}_${employee.user?.name || 'Employee'}.html`;
        const encodedFileName = encodeURIComponent(fileName);

        return new NextResponse(htmlContent, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `inline; filename*=UTF-8''${encodedFileName}`,
            }
        });

    } catch (error) {
        console.error("PDF Generator Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
