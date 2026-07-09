# GOPEAK ERP - Remote MCP Server

This is a standalone Express server that connects GOPEAK ERP (via Prisma + Neon Postgres) to Claude's Custom Connector using the official `@modelcontextprotocol/sdk`.

## Required Environment Variables

To run this server locally or on Railway, ensure these are set in your `.env`:

- `DATABASE_URL` — Connection string to your ERP's Neon PostgreSQL database.
- `MCP_SECRET` — A secure token to protect your connector from public access.
- `PORT` — The port the server will listen on (Railway provides this automatically).

*Example:*
```env
PORT=3000
MCP_SECRET=b63795b8d009228e
DATABASE_URL=postgresql://user:pass@host/db
```

## Deployment on Railway

1. Push this folder to a GitHub repository.
2. In Railway, click **New Project** → **Deploy from GitHub repo**.
3. Go to the project **Variables** and add `DATABASE_URL` and `MCP_SECRET`.
4. Railway will automatically build and start the server using `npm start`.
5. Railway will automatically expose a public HTTPS domain (e.g., `https://erp-mcp.up.railway.app`).

## Connecting to Claude

Once deployed, go to **Claude Settings → Custom Connectors** and add:

- **Name:** GOPEAK ERP
- **URL:** `https://<YOUR_RAILWAY_DOMAIN>/mcp/<YOUR_MCP_SECRET>`

*Example URL:*
`https://erp-mcp.up.railway.app/mcp/b63795b8d009228e`

## Available Tools (ERP Wrapped)

- `list_employees`
- `get_inventory_stock`
- `get_financial_summary`
- `create_expense_request`
- `list_active_quests`
- `create_sales_order` (New! Auto-deducts inventory and creates transactions)
