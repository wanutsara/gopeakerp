import { prisma } from "@/lib/prisma";

// Configurable Constants (Dopamine Metrics)
export const EXP_PER_LEVEL = 100;
export const EXP_MOOD_CHECKIN = 10;
export const EXP_KUDOS_RECEIVED = 20;
export const EXP_KUDOS_SENT = 5;
export const EXP_QUEST_COMPLETED = 50;

/**
 * Injects Experience Points to an Employee, triggering recursive Level-Up checks.
 * Returns the computation delta to be used for frontend Confetti/Audio triggers.
 */
export async function addExperiencePoints(employeeId: string, expAmount: number) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return null;

    let newExp = employee.currentExp + expAmount;
    let newLevel = employee.level;
    let hasLeveledUp = false;

    // Handle cascading level-ups (e.g. if they gained 300 EXP at once)
    while (newExp >= EXP_PER_LEVEL) {
        newExp -= EXP_PER_LEVEL;
        newLevel += 1;
        hasLeveledUp = true;
    }

    const updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
            currentExp: newExp,
            level: newLevel
        }
    });

    return {
        expGained: expAmount,
        newExp,
        newLevel,
        hasLeveledUp,
        employee: updatedEmployee
    };
}
