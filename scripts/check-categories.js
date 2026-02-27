const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.asset.findMany({ select: { id: true, itemName: true, category: true } });
  const cats = {};
  r.forEach(a => { cats[a.category || 'NULL'] = (cats[a.category || 'NULL'] || 0) + 1; });
  console.log('Category distribution:', JSON.stringify(cats, null, 2));
  const generals = r.filter(a => a.category === 'general');
  console.log(`\n${generals.length} items with "general" (default) category:`);
  generals.slice(0, 10).forEach(a => console.log(`  - ${a.itemName}`));
  if (generals.length > 10) console.log(`  ... and ${generals.length - 10} more`);
  await p.$disconnect();
})();
