import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { th } from "date-fns/locale";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = new Date();
        const yesterday = subDays(today, 1);

        const [
            allEmployeesCount,
            todayLogs,
            yesterdayLogs,
            last7DaysLogs,
            monthlyLogs
        ] = await Promise.all([
            prisma.employee.count({ where: { status: "ACTIVE" } }),

            prisma.timeLog.findMany({
                where: {
                    date: {
                        gte: startOfDay(today),
                        lte: endOfDay(today)
                    }
                },
                include: {
                    employee: {
                        include: {
                            department: true,
                            user: { select: { image: true, name: true } }
                        }
                    }
                },
                orderBy: { checkInTime: 'asc' }
            }),

            prisma.timeLog.findMany({
                where: {
                    date: {
                        gte: startOfDay(yesterday),
                        lte: endOfDay(yesterday)
                    }
                }
            }),

            prisma.timeLog.findMany({
                where: {
                    date: {
                        gte: startOfDay(subDays(today, 6)),
                        lte: endOfDay(today)
                    }
                }
            }),

            prisma.timeLog.findMany({
                where: {
                    date: {
                        gte: startOfDay(subDays(today, 30)),
                        lte: endOfDay(today)
                    }
                },
                include: {
                    employee: {
                        include: {
                            department: true,
                            user: { select: { name: true, image: true } }
                        }
                    }
                }
            })
        ]);

        // 1. KPI Calculation (Today vs Yesterday)
        const computeKPI = (logs: any[], totalBase: number) => {
            const present = logs.length;
            const onTime = logs.filter(l => l.status === "ON_TIME").length;
            const late = logs.filter(l => l.status === "LATE").length;
            // Absences = Active Employees - present
            const absent = Math.max(0, totalBase - present);
            const rate = totalBase > 0 ? (present / totalBase) * 100 : 0;
            return { present, onTime, late, absent, rate: rate.toFixed(1) };
        };

        const todayStats = computeKPI(todayLogs, allEmployeesCount);
        const yesterdayStats = computeKPI(yesterdayLogs, allEmployeesCount);

        // 2. Average Arrival Time (Using Monthly Logs for a stable average)
        let totalMinutes = 0;
        let countForAvg = 0;
        monthlyLogs.forEach(log => {
            if (log.checkInTime) {
                const dateObj = new Date(log.checkInTime);
                totalMinutes += (dateObj.getHours() * 60) + dateObj.getMinutes();
                countForAvg++;
            }
        });

        let avgArrivalStr = "--:--";
        if (countForAvg > 0) {
            const avgMins = Math.floor(totalMinutes / countForAvg);
            const h = Math.floor(avgMins / 60).toString().padStart(2, '0');
            const m = (avgMins % 60).toString().padStart(2, '0');
            avgArrivalStr = `${h}:${m}`;
        }

        // 3. Weekly Trends
        const weeklyTrends = [];
        for (let i = 6; i >= 0; i--) {
            const targetDate = subDays(today, i);
            const formattedDateStr = format(targetDate, 'eee', { locale: th });

            const logsForDay = last7DaysLogs.filter(l => {
                const lDate = new Date(l.date);
                return lDate.getDate() === targetDate.getDate() && lDate.getMonth() === targetDate.getMonth();
            });

            const stats = computeKPI(logsForDay, allEmployeesCount);

            weeklyTrends.push({
                date: formattedDateStr,
                fullDate: format(targetDate, 'yyyy-MM-dd'),
                onTime: stats.onTime,
                late: stats.late,
                absent: stats.absent
            });
        }

        // 4. Leaderboards (Monthly)
        const employeeStatsMap = new Map<string, { employee: any, onTimeCount: number, lateCount: number }>();

        monthlyLogs.forEach(log => {
            const empId = log.employeeId;
            if (!employeeStatsMap.has(empId)) {
                employeeStatsMap.set(empId, { employee: log.employee, onTimeCount: 0, lateCount: 0 });
            }
            const empRecord = employeeStatsMap.get(empId)!;
            if (log.status === "ON_TIME") empRecord.onTimeCount++;
            if (log.status === "LATE") empRecord.lateCount++;
        });

        const leaderboardArray = Array.from(employeeStatsMap.values());

        const topPunctual = [...leaderboardArray]
            .sort((a, b) => b.onTimeCount - a.onTimeCount)
            .slice(0, 5)
            .map(e => ({
                id: e.employee.id,
                name: e.employee.user?.name || "Unknown",
                department: e.employee.department?.name || "No Dept",
                image: e.employee.user?.image,
                count: e.onTimeCount
            }));

        const lateWatchlist = [...leaderboardArray]
            .sort((a, b) => b.lateCount - a.lateCount)
            .filter(e => e.lateCount > 0)
            .slice(0, 5)
            .map(e => ({
                id: e.employee.id,
                name: e.employee.user?.name || "Unknown",
                department: e.employee.department?.name || "No Dept",
                image: e.employee.user?.image,
                count: e.lateCount
            }));

        // 5. Daily Roster
        const dailyRoster = todayLogs.map(log => ({
            id: log.id,
            employeeId: log.employeeId,
            name: log.employee.user?.name || "Unknown",
            department: log.employee.department?.name || "No Dept",
            image: log.employee.user?.image,
            checkInTime: log.checkInTime,
            status: log.status
        }));

        return NextResponse.json({
            today: todayStats,
            yesterday: yesterdayStats,
            averageArrivalTime: avgArrivalStr,
            weeklyTrends,
            leaderboard: {
                topPunctual,
                lateWatchlist
            },
            dailyRoster
        });

    } catch (error) {
        console.error("Error generating attendance analytics:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
