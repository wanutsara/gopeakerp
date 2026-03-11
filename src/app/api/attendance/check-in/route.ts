import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Math Helper: Haversine Formula
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action, lat, lng, forceOutLocation } = body; // action is "CHECK_IN" or "CHECK_OUT"

        if (!action || !lat || !lng) {
            return NextResponse.json({ error: "Missing required fields (action, lat, lng)" }, { status: 400 });
        }

        // 1. Get Employee and their Department
        const employee = await prisma.employee.findFirst({
            where: { user: { email: session.user.email } },
            include: { department: true }
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee account not found" }, { status: 404 });
        }

        // 2. Get Company Global Settings
        let companySetting = await prisma.companySetting.findFirst();
        if (!companySetting) {
            // Failsafe mostly, should not happen if admin set it up
            return NextResponse.json({ error: "Company settings not configured yet. Please contact admin." }, { status: 400 });
        }

        // 3. Resolve Hierarchy Constraints (Employee > Department > Company)
        const targetLat = employee.customLat ?? employee.department?.lat ?? companySetting.defaultLat;
        const targetLng = employee.customLng ?? employee.department?.lng ?? companySetting.defaultLng;
        const targetRadius = employee.customRadius ?? employee.department?.radius ?? companySetting.defaultRadius;

        const targetWorkStart = employee.customWorkStart ?? employee.department?.workStart ?? companySetting.defaultWorkStart;
        const targetCutoff = employee.customLogicalCutoff ?? employee.department?.logicalCutoff ?? companySetting.defaultLogicalCutoff ?? "04:00";

        if (!targetLat || !targetLng) {
            return NextResponse.json({ error: "GPS Check-In location is not configured for your profile." }, { status: 400 });
        }

        // 4. Calculate Distance
        const distance = getDistanceFromLatLonInM(lat, lng, targetLat, targetLng);

        const isOutOfLocation = distance > targetRadius;

        if (isOutOfLocation && !forceOutLocation) {
            return NextResponse.json({
                requiresConfirmation: true,
                message: `คุณอยู่นอกระยะที่กำหนด (อยู่ห่างออกไป ${Math.round(distance)} เมตรจากจุดศูนย์กลาง) หากคุณดำเนินการต่อ ระบบจะบันทึกว่าคุณเข้างาน 'นอกสถานที่'`,
                distance: Math.round(distance)
            }, { status: 400 });
        }

        // 5. Handle Action Specifics
        const now = new Date();

        if (action === "CHECK_IN") {
            // Logical Cutoff Computation FIRST
            const [cutoffHH, cutoffMM] = targetCutoff.split(':').map(Number);
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            let logicalDate = new Date(now);
            if (currentHour < cutoffHH || (currentHour === cutoffHH && currentMinute < cutoffMM)) {
                logicalDate.setDate(logicalDate.getDate() - 1);
            }

            // --- Auto-Rounding AI for Check-In ---
            const [startHH, startMM] = targetWorkStart.split(':').map(Number);
            const shiftStartTarget = new Date(logicalDate);
            shiftStartTarget.setHours(startHH, startMM, 0, 0);

            const graceLimit = new Date(shiftStartTarget);
            graceLimit.setMinutes(graceLimit.getMinutes() + (companySetting.gracePeriodMinutes ?? 15));

            let payableCheckInTime = now;
            let isLate = false;

            if (now <= graceLimit) {
                // Forgive minor lateness and snap down to shift start (e.g. 09:00)
                if (now < shiftStartTarget) {
                     payableCheckInTime = shiftStartTarget; // If arrive 08:30, snap up to 09:00? The user wants strict tracking but usually we snap forward. 
                     // Wait, user said "prevent wage bleeding". If arrive early, snap to 09:00.
                     payableCheckInTime = shiftStartTarget;
                } else {
                     payableCheckInTime = shiftStartTarget; // 09:14 snaps down to 09:00.
                }
            } else {
                isLate = true; // 09:16 is punished to exactly 09:16
            }

            // Normalize
            const todayUtc = new Date(Date.UTC(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate()));

            let logStatus = isLate ? "LATE" : "ON_TIME";
            if (isOutOfLocation && forceOutLocation) {
                logStatus = "OUT_OF_LOCATION";
            }

            try {
                const timeLog = await prisma.timeLog.create({
                    data: {
                        employeeId: employee.id,
                        date: todayUtc,
                        checkInTime: now,
                        payableCheckInTime: payableCheckInTime,
                        checkInLat: lat,
                        checkInLng: lng,
                        status: logStatus
                    }
                });

                return NextResponse.json({
                    success: true,
                    message: "เช็คอินสำเร็จ!",
                    status: timeLog.status,
                    distance: Math.round(distance)
                });
            } catch (err: any) {
                // If unique constraint fails, they already checked in today
                if (err.code === 'P2002') {
                    return NextResponse.json({ error: "คุณได้เช็คอินของวันนี้ไปแล้ว" }, { status: 400 });
                }
                throw err;
            }

        } else if (action === "CHECK_OUT") {
            // Find the active check-in for the logical day
            const [cutoffHH, cutoffMM] = targetCutoff.split(':').map(Number);
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            let logicalDate = new Date(now);
            if (currentHour < cutoffHH || (currentHour === cutoffHH && currentMinute < cutoffMM)) {
                logicalDate.setDate(logicalDate.getDate() - 1);
            }

            const todayUtc = new Date(Date.UTC(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate()));

            const activeLog = await prisma.timeLog.findUnique({
                where: {
                    employeeId_date: {
                        employeeId: employee.id,
                        date: todayUtc
                    }
                }
            });

            if (!activeLog) {
                return NextResponse.json({ error: "ไม่พบข้อมูลเช็คอินของวันนี้ กรุณาเช็คอินก่อน" }, { status: 400 });
            }

            if (activeLog.checkOutTime) {
                return NextResponse.json({ error: "คุณได้เช็คเอาท์ไปแล้วของวันนี้" }, { status: 400 });
            }

            const targetWorkEnd = employee.customWorkEnd ?? employee.department?.workEnd ?? companySetting.defaultWorkEnd ?? "18:00";
            const strictCutoff = companySetting.strictOutboundCutoff ?? true;

            let payableCheckOutTime = new Date(now);
            if (strictCutoff) {
                const [endHH, endMM] = targetWorkEnd.split(':').map(Number);
                const shiftEndTarget = new Date(logicalDate);
                shiftEndTarget.setHours(endHH, endMM, 0, 0);
                
                const [startHH] = (employee.customWorkStart ?? employee.department?.workStart ?? companySetting.defaultWorkStart ?? "09:00").split(':').map(Number);
                if (endHH < startHH) {
                    shiftEndTarget.setDate(shiftEndTarget.getDate() + 1); // Overnight shift
                }

                if (now > shiftEndTarget) {
                    // Prevent wage bleeding by snapping late check-outs back to 18:00
                    payableCheckOutTime = shiftEndTarget;
                }
            }

            const updatedLog = await prisma.timeLog.update({
                where: { id: activeLog.id },
                data: {
                    checkOutTime: now,
                    payableCheckOutTime: payableCheckOutTime,
                    checkOutLat: lat,
                    checkOutLng: lng
                }
            });

            return NextResponse.json({
                success: true,
                message: "เช็คเอาท์สำเร็จ!",
                distance: Math.round(distance)
            });

        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }


    } catch (error: any) {
        console.error("GPS Check-in Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
