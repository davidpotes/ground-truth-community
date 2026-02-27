const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { id: true, name: true, email: true } })
  .then(u => { console.log(JSON.stringify(u)); p.$disconnect(); });
