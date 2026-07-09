import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// CORS — allow Anthropic cloud to connect
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/health", (_req, res) => res.send("OK"));

function buildServer() {
  const server = new McpServer({ name: "gopeak-erp-mcp", version: "1.0.0" });

  // 1. list_employees
  server.tool(
    "list_employees",
    "ดึงรายชื่อพนักงาน แผนก เลเวล และประสบการณ์ (XP/Coins) ในบริษัท",
    {
      limit: z.number().default(20).describe("จำนวนสูงสุดที่ต้องการแสดง")
    },
    async ({ limit }) => {
      try {
        const employees = await prisma.employee.findMany({
          take: limit,
          include: { user: true, department: true },
          orderBy: { level: 'desc' }
        });
        const mapped = employees.map(e => ({
          id: e.id,
          name: e.user.name,
          department: e.department?.name || 'N/A',
          level: e.level,
          xp: e.exp,
          coins: e.coins,
          status: e.status
        }));
        return { content: [{ type: "text", text: JSON.stringify(mapped, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // 2. get_inventory_stock
  server.tool(
    "get_inventory_stock",
    "เช็คยอดสต็อกสินค้าคงเหลือทั้งหมด (และจองแล้ว/กำลังมา) ในทุกโกดัง",
    {
      search: z.string().optional().describe("ค้นหาจากชื่อสินค้าหรือ SKU")
    },
    async ({ search }) => {
      try {
        const where = search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { sku: { contains: search, mode: 'insensitive' as any } }
          ]
        } : {};
        const levels = await prisma.inventoryLevel.findMany({
          where: { product: where },
          include: { product: true, location: true },
          take: 50
        });
        const mapped = levels.map(l => ({
          product_name: l.product.name,
          sku: l.product.sku,
          location: l.location.name,
          available: l.available,
          committed: l.committed,
          incoming: l.incoming
        }));
        return { content: [{ type: "text", text: JSON.stringify(mapped, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // 3. get_financial_summary
  server.tool(
    "get_financial_summary",
    "สรุปยอดรายรับ-รายจ่าย (Cashflow) และประวัติธุรกรรมล่าสุด 20 รายการ",
    {},
    async () => {
      try {
        const income = await prisma.transaction.aggregate({
          where: { type: 'INCOME' },
          _sum: { amountTHB: true }
        });
        const expense = await prisma.transaction.aggregate({
          where: { type: 'EXPENSE' },
          _sum: { amountTHB: true }
        });
        
        const recent = await prisma.transaction.findMany({
          orderBy: { date: 'desc' },
          take: 20,
          select: { type: true, amountTHB: true, description: true, date: true }
        });

        const summary = {
          totalIncomeTHB: income._sum.amountTHB || 0,
          totalExpenseTHB: expense._sum.amountTHB || 0,
          netProfitTHB: (income._sum.amountTHB || 0) - (expense._sum.amountTHB || 0),
          recentTransactions: recent
        };
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // 4. create_expense_request
  server.tool(
    "create_expense_request",
    "สร้างคำขอเบิกค่าใช้จ่าย (AP) ใหม่เข้าสู่ระบบ (ต้องระบุ requestor_employee_id ด้วย)",
    {
      title: z.string().describe("หัวข้อการเบิก"),
      amount: z.number().describe("จำนวนเงิน (บาท)"),
      requestor_employee_id: z.string().describe("ID ของพนักงานที่เป็นคนเบิก"),
      description: z.string().optional().describe("รายละเอียดเพิ่มเติม")
    },
    async ({ title, amount, requestor_employee_id, description }) => {
      try {
        const expense = await prisma.expenseRequest.create({
          data: {
            title,
            amount,
            netPayable: amount,
            requestorId: requestor_employee_id,
            description,
            status: 'PENDING'
          }
        });
        return { content: [{ type: "text", text: `Expense Request created successfully! ID: ${expense.id}` }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // 5. list_active_quests
  server.tool(
    "list_active_quests",
    "ดูรายการเควสต์เกมมิฟิเคชัน (Gamification) ที่กำลังเปิดอยู่ทั้งหมด (status: OPEN, IN_PROGRESS)",
    {},
    async () => {
      try {
        const quests = await prisma.quest.findMany({
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 30
        });
        return { content: [{ type: "text", text: JSON.stringify(quests, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  // 6. create_sales_order
  server.tool(
    "create_sales_order",
    "บันทึกยอดขายรายวัน สร้าง Order และอัปเดตรายรับ (Transaction) เข้า ERP อัตโนมัติ",
    {
      customer_id: z.string().optional().describe("ID ลูกค้า (ถ้ามี)"),
      channel: z.enum(['FACEBOOK', 'SHOPEE', 'TIKTOK', 'OTHER', 'LAZADA', 'LINESHOPPING', 'IG', 'POS']).describe("ช่องทางการขาย (เช่น FACEBOOK, TIKTOK, POS)"),
      subtotal: z.number().describe("ยอดเงินรวมของออเดอร์นี้"),
      notes: z.string().optional().describe("หมายเหตุ (เช่น ขายรายวันโดยพนักงาน A)"),
      items: z.array(z.object({
        product_name: z.string().describe("ชื่อสินค้า"),
        product_id: z.string().optional().describe("ID สินค้า (ถ้ามี) เพื่อให้สามารถผูกเพื่อตัดสต็อกได้"),
        quantity: z.number().describe("จำนวนที่สั่งซื้อ"),
        price: z.number().describe("ราคาต่อชิ้น")
      })).describe("รายการสินค้าในออเดอร์")
    },
    async ({ customer_id, channel, subtotal, notes, items }) => {
      try {
        // Create Order + Items + Transaction in one Prisma transaction to guarantee consistency
        const order = await prisma.$transaction(async (tx) => {
          const newOrder = await tx.order.create({
            data: {
              customerId: customer_id,
              channel: channel as any,
              status: 'COMPLETED',
              subtotal,
              total: subtotal,
              notes,
              items: {
                create: items.map(item => ({
                  productName: item.product_name,
                  productId: item.product_id,
                  quantity: item.quantity,
                  price: item.price
                }))
              }
            }
          });

          // Also create an INCOME transaction linked to this Order
          await tx.transaction.create({
            data: {
              type: 'INCOME',
              amount: subtotal,
              amountTHB: subtotal,
              description: `Sales Order: ${newOrder.id} (${channel})`,
              category: 'SALES_REVENUE'
            }
          });

          // Optional: Decrement Inventory if product_id is provided
          // Since inventory decrement logic can be complex in multi-locations, we do a basic decrement on a default warehouse if exists.
          // For simplicity here we just log it, but since you wanted inventory update:
          for (const item of items) {
            if (item.product_id) {
              const defaultLevel = await tx.inventoryLevel.findFirst({
                where: { productId: item.product_id }
              });
              if (defaultLevel) {
                await tx.inventoryLevel.update({
                  where: { id: defaultLevel.id },
                  data: { available: { decrement: item.quantity } }
                });
                await tx.inventoryLog.create({
                  data: {
                    productId: item.product_id,
                    type: 'OUTBOUND',
                    quantityChanged: -item.quantity,
                    balanceAfter: defaultLevel.available - item.quantity,
                    reference: `Order ${newOrder.id}`
                  }
                });
              }
            }
          }
          return newOrder;
        });

        return { content: [{ type: "text", text: `Sales Order created successfully! Order ID: ${order.id}. Transactions & inventory updated.` }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
    }
  );

  return server;
}

function checkToken(req: any, res: any): boolean {
  if (req.params.token !== process.env.MCP_SECRET) {
    res.status(401).json({ error: "Unauthorized: Invalid MCP_SECRET token in URL path" });
    return false;
  }
  return true;
}

// Stateless Streamable HTTP: new transport per request
app.post("/mcp/:token", async (req, res) => {
  if (!checkToken(req, res)) return;
  const server = buildServer();
  // @ts-ignore (sessionIdGenerator undefined makes it stateless)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp/:token", (req, res) => {
  if (checkToken(req, res)) res.status(405).set("Allow", "POST").end();
});

app.delete("/mcp/:token", (req, res) => {
  if (checkToken(req, res)) res.status(200).send("OK");
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`MCP server listening on port ${port}`));
