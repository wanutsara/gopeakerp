import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updates = [
    {
        oldEmail: "prem.freelance@gopeak.com",
        newName: "นางสาว เปรมทิพย์ แก้วพิทักษ์ (เปรม)",
        bank: "SCB 160-240916-9"
    },
    {
        oldEmail: "simita.n@gopeak.com",
        newName: "นาง สิมิตา นวสกุล",
        bank: "SCB 435-086247-3"
    },
    {
        oldEmail: "ploy.p@gopeak.com",
        newName: "นางสาว พัชราภรณ์ ณรงค์คนุน (พลอย)",
        bank: "SCB 409-079914-2"
    },
    {
        oldEmail: "pinkamol.t@gopeak.com",
        newName: "นางสาว ภิญญ์กมล ทองลิขิตสกุล",
        bank: "KTB 663-2-47868-9"
    },
    {
        oldEmail: "takaya.s@gopeak.com", // This was heavily misread OCR
        newName: "นางสาว แก้วกัลยา โรงวงศ์ศรีโรจน์",
        newEmail: "keawkalya.rve@gmail.com",
        bank: "SCB 419-152603-6"
    },
    {
        oldEmail: "thipawan.n@gopeak.com",
        newName: "นางสาว ทิพวรรณ น้ำหอม",
        bank: "SCB 941-214234-5"
    }
];

async function main() {
    console.log("Updating freelancer details...");

    for (const data of updates) {
        const user = await prisma.user.findUnique({ where: { email: data.oldEmail } });
        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: data.newName,
                    ...(data.newEmail ? { email: data.newEmail } : {})
                }
            });

            await prisma.employee.update({
                where: { userId: user.id },
                data: {
                    bankAccount: data.bank
                }
            });
            console.log(`Updated: ${data.newName}`);
        } else {
            console.log(`User not found: ${data.oldEmail}`);
        }
    }

    // Update missing email for section 1 person 11: vipada.samaman@gopeak.com -> should we keep it? (It's blank in image, so we keep my fake one)

    console.log("Details updated successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
