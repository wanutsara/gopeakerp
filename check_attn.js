const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const attendances = await prisma.attendance.findMany({
            include: { employee: { include: { user: true } } },
            orderBy: { date: 'desc' },
            take: 5
        });

        console.log("=== LATEST ATTENDANCE RECORDS ===");
        if (attendances.length === 0) {
            console.log("NO ATTENDANCE RECORDS FOUND IN DATABASE.");
        } else {
            for (const a of attendances) {
                console.log(`Emp: ${a.employee?.user?.name || a.employeeId} | Date: ${a.date} | In: ${a.checkIn} | Out: ${a.checkOut}`);
            }
        }
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
