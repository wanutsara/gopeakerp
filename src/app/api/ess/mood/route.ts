import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addExperiencePoints, EXP_MOOD_CHECKIN } from "@/lib/gamification";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 400 });
        }

        // Get mood history (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const moods = await prisma.employeeMood.findMany({
            where: {
                employeeId: employee.id,
                date: {
                    gte: sevenDaysAgo
                }
            },
            orderBy: { date: 'desc' }
        });

        // Also check if they submitted a mood today
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setUTCHours(23, 59, 59, 999);

        const todayMood = await prisma.employeeMood.findFirst({
            where: {
                employeeId: employee.id,
                date: {
                    gte: today,
                    lte: endOfToday
                }
            }
        });

        return NextResponse.json({
            history: moods,
            hasSubmittedToday: !!todayMood,
            todayMood
        });

    } catch (error) {
        console.error("Error fetching mood data:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const employee = await prisma.employee.findUnique({
            where: { userId: session.user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee profile not found" }, { status: 400 });
        }

        const body = await request.json();
        const { mood, note } = body;

        if (!mood || !["GREAT", "GOOD", "OKAY", "BAD", "TERRIBLE"].includes(mood)) {
            return NextResponse.json({ error: "Invalid mood type" }, { status: 400 });
        }

        // We record mood for "today" (local date approximation or UTC)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // normalize to start of day UTC

        let latestMood;

        // Check if this is the first submission today to prevent EXP Farming
        const existingMood = await prisma.employeeMood.findFirst({
            where: { employeeId: employee.id, date: today }
        });

        let expGain = null;
        if (!existingMood) {
            expGain = await addExperiencePoints(employee.id, EXP_MOOD_CHECKIN);
        }

        // Use upsert to prevent unique constraint errors (one mood per day)
        try {
            latestMood = await prisma.employeeMood.upsert({
                where: {
                    employeeId_date: {
                        employeeId: employee.id,
                        date: today
                    }
                },
                update: {
                    mood,
                    note: note || null,
                },
                create: {
                    employeeId: employee.id,
                    date: today,
                    mood,
                    note: note || null
                }
            });
        } catch (e) {
            // Fallback if upsert fails on constraint
            latestMood = await prisma.employeeMood.create({
                data: {
                    employeeId: employee.id,
                    date: today,
                    mood,
                    note: note || null
                }
            });
        }

        return NextResponse.json({ ...latestMood, xp: expGain }, { status: 201 });

    } catch (error) {
        console.error("Error submitting mood:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
