import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const employeeData = [
    // Image 1: Main Payroll
    { name: "นางสาวธีรณา สนธิสุนทร", email: "teerana@gez.tv", position: "Vice President", wageRate: 50000, bankAccount: "SCB 437-149973-2", type: "MONTHLY" },
    { name: "นาย ธนากร ทะเลทอง (แม้ว)", email: "tanaborvorn@gez.tv", position: "Chief Financial Office", wageRate: 20664, bankAccount: "SCB 437-081885-2", type: "MONTHLY" },
    { name: "น.ส. กุลนิษฐ์ โคกศิริ (ตุ๊ก)", email: "kullanid@gez.tv", position: "Product Owner", wageRate: 28886, bankAccount: "SCB 215-241-7731", type: "MONTHLY" },
    { name: "น.ส. ประภัสสร ศิริกช (นก-หวง)", email: "prapasiri@gez.tv", position: "Operation", wageRate: 18849, bankAccount: "SCB 177-2-69939-3", type: "MONTHLY" },
    { name: "น.ส. สุมนา มีผลโภค (มาย กราฟิก)", email: "sumana.m@gez.tv", position: "Graphic", wageRate: 27125, bankAccount: "SCB 292-245553-7", type: "MONTHLY" },
    { name: "น.ส. เจนนิสา ศรีสถาน (เจน-หวง)", email: "jane0900247790@gmail.com", position: "Operation", wageRate: 17219, bankAccount: "SCB 435-108575-7", type: "MONTHLY" },
    { name: "นางสาว ณัฏฐนันท์ ศรีวงษ์ (เป้เป้)", email: "natthanansrisorn105@gmail.com", position: "Customer Service", wageRate: 14000, bankAccount: "SCB 160-452144-6", type: "MONTHLY" },
    { name: "นาย ณรงค์ พรหมบุตรดา (เพชร)", email: "6106024802@rumail.ru.ac.th", position: "Staff", wageRate: 13000, bankAccount: "SCB 177-291008-2", type: "MONTHLY" },
    { name: "นางสาว นิลมณี วจีประดิษฐ์", email: "pondmombug81@gmail.com", position: "Staff", wageRate: 14000, bankAccount: "SCB 505-443294-0", type: "MONTHLY" },
    { name: "นางสาว มัณฑิรา สมบูรณ์ (ก้อย Same)", email: "koy@gez.tv", position: "Admin", wageRate: 11025, bankAccount: "SCB 409-269426-7", type: "MONTHLY" },
    { name: "นางสาว วิภาดา สะมะแมน (นา)", email: "vipada.samaman@gopeak.com", position: "Staff", wageRate: 12000, bankAccount: "SCB 427-159814-9", type: "MONTHLY" },

    // Image 2: Freelance
    { name: "นางสาว เปรมทิพย์ แก้วพิทักษ์ (เปรม)", email: "prem.freelance@gopeak.com", position: "Freelance", wageRate: 5000, bankAccount: "", type: "DAILY" },
    { name: "นาง สิมิตา นวสกุล", email: "simita.n@gopeak.com", position: "Freelance", wageRate: 32000, bankAccount: "", type: "DAILY" },
    { name: "นางสาว พัชราภรณ์ ณรงค์กุล (พลอย)", email: "ploy.p@gopeak.com", position: "Freelance", wageRate: 1600, bankAccount: "", type: "DAILY" },
    { name: "นางสาว ภิญญ์กมล ทองลิขิตสกุล", email: "pinkamol.t@gopeak.com", position: "Freelance", wageRate: 15000, bankAccount: "", type: "DAILY" },
    { name: "นางสาว ทักขยยา โสภาวงษ์วรวัฒน์", email: "takaya.s@gopeak.com", position: "Freelance", wageRate: 10000, bankAccount: "", type: "DAILY" },
    { name: "นางสาว ทิพวรรณ นนทลี", email: "thipawan.n@gopeak.com", position: "Freelance", wageRate: 10000, bankAccount: "", type: "DAILY" },

    // Image 3: Cash / Off-system
    { name: "นางสาว พรรณนิภา นานา", email: "puannipanan31@gmail.com", position: "Staff", wageRate: 3600, bankAccount: "กรุงไทย 344-0-86972-5", type: "MONTHLY" },
    { name: "นาย ศุภวิชญ์ ตรัยธนสาร (ฟาร์ม)", email: "suppawit336625@gez.tv", position: "Staff", wageRate: 0, bankAccount: "SCB 292-237887-4", type: "MONTHLY" }, // Base is 0, gets commission
];

async function main() {
    console.log("Seeding employees from images...");
    const hashedPassword = await bcrypt.hash("123456", 10);

    for (const data of employeeData) {
        // Skip if email exists to avoid unique constraint errors
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            console.log(`Skipping ${data.email}, already exists.`);
            continue;
        }

        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: "STAFF",
            }
        });

        await prisma.employee.create({
            data: {
                userId: user.id,
                employeeType: data.type as any,
                position: data.position,
                wageRate: data.wageRate,
                bankAccount: data.bankAccount,
                status: "ACTIVE",
            }
        });

        console.log(`Created: ${data.name} (${data.email})`);
    }

    console.log("Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
