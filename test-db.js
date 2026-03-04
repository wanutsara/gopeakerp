const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reqs = await prisma.timeAdjustmentRequest.findMany();
  console.log("Requests:", reqs);
}
main();
