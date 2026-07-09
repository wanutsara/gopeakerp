import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('123456', 10)

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@tamaya.com' },
        update: {},
        create: {
            email: 'admin@tamaya.com',
            name: 'Admin Tamaya',
            password: hashedPassword,
            role: 'OWNER',
        },
    })

    console.log({ adminUser })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
