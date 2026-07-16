# 🧠 AI Context Handover: GOPEAK ERP & MCP Connector

> **Attention AI Assistant:** This document contains the complete context, architectural constraints, and business logic overview for the GOPEAK ERP and its Remote MCP Connector. Please read this entirely before making modifications.

## 1. System Overview
**GOPEAK ERP** is a full-fledged enterprise resource planning system tailored for online commerce. It features Order Management (OMS), Human Resources (with Gamification like Quests, XP, Coins, and Mood tracking), Finance (Cashflow, Accounts Payable), and Inventory management.

The **MCP Connector** (located in the `/erp-mcp-connector` directory) is a standalone remote server built on the official Model Context Protocol. It allows AI assistants (like Claude's Custom Connector) to securely interact with the ERP's database, execute business logic (like creating sales orders automatically), and retrieve real-time insights.

## 2. Technical Architecture
- **ERP Main App:** Next.js 16.1 (App Router), TypeScript, Prisma ORM, Neon PostgreSQL.
- **MCP Server:** Node.js (v22), Express, TypeScript, `@modelcontextprotocol/sdk`, Zod for schema validation.
- **Database Connection:** The MCP server shares the same Neon Postgres database as the ERP. It uses `PrismaClient` (v6.19.2) to interact with the database directly.
- **Deployment:** Hosted on Railway. The MCP server uses a monorepo structure where the Railway Root Directory is set to `/erp-mcp-connector`.

## 3. MCP Server Constraints & Hard Requirements
If you need to modify or extend the MCP server, you **MUST** adhere to these strict rules. Deviating from these will cause the connection to Anthropic/Claude to fail:

1. **Transport Layer:** Uses `StreamableHTTPServerTransport` (MCP spec 2025-11-25). Only ONE endpoint handles all JSON-RPC logic via `POST /mcp/:token`. Do NOT use `stdio`. Do NOT use the legacy two-endpoint HTTP+SSE.
2. **Stateless Session:** A new `McpServer` and `transport` are instantiated per request. `sessionIdGenerator` is set to `undefined`. Do NOT keep an in-memory session map.
3. **Authentication:** Token-based via URL path (`/mcp/:token`). Every request validates against the `process.env.MCP_SECRET`.
4. **CORS:** Highly permissive (`Access-Control-Allow-Origin: *`, `Methods: GET, POST, DELETE, OPTIONS`, `Expose-Headers: Mcp-Session-Id`) to allow Anthropic's cloud IPs to connect.
5. **Network Binding:** Listens strictly on `0.0.0.0` and `process.env.PORT` (or fallback 3000).

## 4. Key Prisma Database Models
To write new tools, you must understand the core schema relationships:
- **`Order` & `OrderItem`**: Core OMS tables. Orders have a `channel` enum (e.g., FACEBOOK, SHOPEE, TIKTOK, POS).
- **`Transaction`**: Records all financial movements. Sales orders map to `INCOME` transactions; expenses map to `EXPENSE` transactions.
- **`InventoryLevel` & `InventoryLog`**: Tracks stock quantities across different physical `Location`s.
- **`Employee` & `User`**: HR models. Employees have RPG-like attributes (`level`, `exp`, `coins`) and gamification stats.
- **`ExpenseRequest`**: Accounts Payable module for employee reimbursements.
- **`Quest`**: Gamification system where managers assign tasks for EXP/Coins rewards.

## 5. Currently Exposed MCP Tools
1. `list_employees`: Returns employee levels, departments, and gamification stats.
2. `get_inventory_stock`: Checks available and committed stock across all warehouses.
3. `get_financial_summary`: Aggregates INCOME vs EXPENSE cashflow from `Transaction`.
4. `create_expense_request`: Logs AP requests from employees.
5. `list_active_quests`: Lists open quests for employees.
6. `create_sales_order`: A complex transactional tool that (1) Creates an Order, (2) Logs an INCOME transaction, and (3) Automatically decrements `InventoryLevel` and creates an `InventoryLog`.

## 6. How to Develop & Extend
- **Local Dev:** `npm run dev` (runs `tsx src/index.ts`). Requires `.env` with `DATABASE_URL` and `MCP_SECRET`.
- **Adding New Tools:** Define tools using `server.tool("name", "description", { schemas }, async (args) => { ... })`. 
- **Error Handling:** Validate inputs. On failure, return an MCP tool error string instead of crashing the server. Example: `return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };`
- **Result Format:** Always serialize results as clean JSON strings or readable text inside `content: [{ type: "text", text: ... }]`.
