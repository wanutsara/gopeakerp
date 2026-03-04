import { PrismaClient } from "@prisma/client";
import { subDays, startOfDay, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding historical attendance logs...");

    const employees = await prisma.employee.findMany({ where: { status: "ACTIVE" } });
    if (employees.length === 0) {
        console.log("No employees found. Run employee seed first.");
        return;
    }

    const today = new Date();

    // Seed for the past 30 days
    for (let i = 0; i <= 30; i++) {
        const targetDate = subDays(today, i);
        // Skip Sundays (0) and Saturdays (6)
        if (targetDate.getDay() === 0 || targetDate.getDay() === 6) continue;

        const dateObj = startOfDay(targetDate);

        // Use Promise.all for faster inserts per day
        const upsertPromises = employees.map(emp => {
            // Determine behavior based on employee index to create distinct "Late" leaders
            const isLateWorker = emp.id.charCodeAt(emp.id.length - 1) % 5 === 0; // ~20% of workers are generally late often

            // Base probabilities
            let onTimeProb = 0.85;
            let lateProb = 0.10;

            if (isLateWorker) {
                onTimeProb = 0.50;
                lateProb = 0.40;
            }

            const rand = Math.random();
            let status = "ON_TIME";
            let checkInTime = null;

            if (rand < onTimeProb) {
                // On time: arrive between 08:20 and 08:55
                checkInTime = setMinutes(setHours(dateObj, 8), 20 + Math.floor(Math.random() * 35));
            } else if (rand < onTimeProb + lateProb) {
                // Late: arrive between 09:05 and 10:30
                status = "LATE";
                checkInTime = setMinutes(setHours(dateObj, 9), 5 + Math.floor(Math.random() * 85));
            } else {
                status = "ABSENT";
            }

            return prisma.timeLog.upsert({
                where: {
                    employeeId_date: {
                        employeeId: emp.id,
                        date: dateObj
                    }
                },
                update: {
                    checkInTime,
                    status
                },
                create: {
                    employeeId: emp.id,
                    date: dateObj,
                    checkInTime,
                    status
                }
            });
        });

        await Promise.all(upsertPromises);
        console.log(`Seeded logs for ${dateObj.toDateString()}`);
    }

    console.log("Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
