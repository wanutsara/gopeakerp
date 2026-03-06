const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add new Models to the end
const newModels = `

// ==========================================
// PHASE 44: MULTI-ENTITY / BRAND SCALING
// ==========================================

model CompanyBrand {
  id                String   @id @default(cuid())
  name              String   @unique 
  isHQ              Boolean  @default(false) 
  taxId             String?  
  branchCode        String?  
  legalName         String?  
  registeredAddress String?
  logoUrl           String?
  createdAt         DateTime @default(now())
  
  users           UserBrandAccess[]
  bankAccounts    BankAccount[]
  transactions    Transaction[]
  expenses        ExpenseRequest[]
  employees       Employee[]
  orders          Order[]
  products        Product[]
}

model UserBrandAccess {
  id              String       @id @default(cuid())
  userId          String
  companyBrandId  String
  assignedAt      DateTime     @default(now())
  
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyBrand    CompanyBrand @relation(fields: [companyBrandId], references: [id], onDelete: Cascade)

  @@unique([userId, companyBrandId])
}

model BankAccount {
  id              String       @id @default(cuid())
  companyBrandId  String
  bankName        String
  accountNumber   String
  accountName     String
  branch          String?
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  
  companyBrand    CompanyBrand @relation(fields: [companyBrandId], references: [id], onDelete: Cascade)
  transactions    Transaction[]
}
`;

if (!schema.includes('model CompanyBrand')) {
    schema += newModels;
}

// 2. Inject relations into existing models
function injectRelation(modelName, fieldsToAdd) {
    const regex = new RegExp(`(model ${modelName} \\{[\\s\\S]*?\\n)(\\})`, 'g');
    if (schema.match(regex)) {
        // Only inject if it doesn't already have companyBrandId
        if (!schema.includes(`companyBrandId String?`) || !schema.match(new RegExp(`model ${modelName} {[\\s\\S]*?companyBrandId`))) {
            schema = schema.replace(regex, `$1  ${fieldsToAdd}\n$2`);
            console.log(`Injected into ${modelName}`);
        }
    }
}

injectRelation('User', 'brandAccess   UserBrandAccess[]');
injectRelation('Employee', 'companyBrandId  String?\n  companyBrand    CompanyBrand? @relation(fields: [companyBrandId], references: [id])');
injectRelation('Order', 'companyBrandId  String?\n  companyBrand    CompanyBrand? @relation(fields: [companyBrandId], references: [id])');
injectRelation('ExpenseRequest', 'companyBrandId  String?\n  companyBrand    CompanyBrand? @relation(fields: [companyBrandId], references: [id])');
injectRelation('Product', 'companyBrandId  String?\n  companyBrand    CompanyBrand? @relation(fields: [companyBrandId], references: [id])');
injectRelation('Transaction', 'companyBrandId  String?\n  companyBrand    CompanyBrand? @relation(fields: [companyBrandId], references: [id])\n  bankAccountId   String?\n  bankAccount     BankAccount?  @relation(fields: [bankAccountId], references: [id])');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log("Schema upgraded successfully.");
