#!/usr/bin/env node
// Seed sample data across the ecosystem

const INTERNAL = 'hojai-internal-service-token-change-me';
const headers = { 'content-type': 'application/json', 'x-internal-token': INTERNAL };

async function call(url, method, body) {
  try {
    const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return await r.json();
  } catch (e) { return { success: false, error: { message: e.message } }; }
}

async function signupUser(product, email, password, name) {
  const base = { do: 8000, nexha: 8100, salar: 8200 }[product];
  let body = { email, password, name };
  if (product === 'nexha') { body = { email, password, companyName: name, type: 'buyer' }; }
  if (product === 'salar') { body = { email, password, name, company: 'AI Studio' }; }
  if (product === 'do') { body = { email, password, name }; }
  const r = await fetch(`http://localhost:${base}/api/auth/signup`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  return await r.json();
}

async function main() {
  console.log('🌱 Seeding HOJAI ecosystem with sample data...\n');

  // 1. Create sample DO user
  console.log('Creating DO consumer...');
  const aliceEmail = `alice-${Date.now()}@demo.com`;
  const alice = await signupUser('do', aliceEmail, 'password1', 'Alice');
  if (alice.success) console.log(`  ✅ ${aliceEmail} / password1`);

  // 2. Create merchant
  console.log('Creating merchants...');
  const merchants = [
    { name: 'TechStore', category: 'electronics', description: 'Best gadgets and electronics', products: [
      { name: 'Laptop Pro 15', price: 1299, stock: 25, category: 'computers' },
      { name: 'Wireless Mouse', price: 29, stock: 200, category: 'accessories' },
      { name: 'Mechanical Keyboard', price: 149, stock: 50, category: 'accessories' },
      { name: 'USB-C Hub', price: 49, stock: 100, category: 'accessories' },
    ]},
    { name: 'FreshMart', category: 'groceries', description: 'Fresh produce and daily essentials', products: [
      { name: 'Organic Milk 1L', price: 4.5, stock: 500, category: 'dairy' },
      { name: 'Whole Wheat Bread', price: 3.5, stock: 100, category: 'bakery' },
      { name: 'Free Range Eggs (12)', price: 6, stock: 200, category: 'dairy' },
      { name: 'Avocados (4 pack)', price: 5, stock: 80, category: 'produce' },
    ]},
    { name: 'StyleBoutique', category: 'fashion', description: 'Trendy fashion at great prices', products: [
      { name: 'Classic White Sneakers', price: 89, stock: 60, category: 'shoes' },
      { name: 'Denim Jacket', price: 129, stock: 30, category: 'outerwear' },
    ]},
  ];
  for (const m of merchants) {
    const r = await call('http://localhost:8003/api/merchants', 'POST', m);
    if (r.success) console.log(`  ✅ ${m.name} (${r.data.productCount} products)`);
  }

  // 3. Create sample B2B companies
  console.log('\nCreating B2B companies...');
  const acmeEmail = `acme-${Date.now()}@demo.com`;
  const acme = await signupUser('nexha', acmeEmail, 'password1', 'Acme Corp');
  if (acme.success) console.log(`  ✅ ${acmeEmail} (buyer) / password1`);
  const steelEmail = `steel-${Date.now()}@demo.com`;
  let steel;
  {
    const r = await fetch('http://localhost:8100/api/auth/signup', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: steelEmail, password: 'password1', companyName: 'Steel Industries', type: 'supplier' })
    });
    steel = await r.json();
  }
  if (steel.success) console.log(`  ✅ ${steelEmail} (supplier) / password1`);

  // Add a product as the supplier
  if (steel.success) {
    const r = await fetch('http://localhost:8100/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + steel.data.token },
      body: JSON.stringify({ name: 'Premium Steel Rods', category: 'raw-materials', unitPrice: 50, stock: 5000, minOrderQuantity: 100 })
    });
    if (r.ok) console.log('  ✅ Sample product added');
  }

  // 4. Create Salar provider with listings
  console.log('\nCreating AI marketplace listings...');
  const devEmail = `dev-${Date.now()}@demo.com`;
  const dev = await signupUser('salar', devEmail, 'password1', 'AI Developer');
  if (dev.success) {
    console.log(`  ✅ ${devEmail} / password1 (provider)`);
    const listings = [
      { title: 'Smart Email Agent', description: 'AI that writes professional emails in your tone. Integrates with Gmail, Outlook.', category: 'agent', tags: ['email', 'productivity', 'writing'], pricing: { model: 'subscription', price: 29.99, currency: 'USD' } },
      { title: 'Code Review Skill', description: 'Automated code review with security and performance insights.', category: 'skill', tags: ['code', 'review', 'devops'], pricing: { model: 'one_time', price: 49 } },
      { title: 'Personal Health Twin', description: 'Digital twin that tracks your health metrics and provides recommendations.', category: 'twin', tags: ['health', 'wellness'], pricing: { model: 'subscription', price: 9.99 } },
      { title: 'Sales Outreach Workflow', description: 'Multi-step workflow for personalized sales outreach at scale.', category: 'workflow', tags: ['sales', 'outreach', 'automation'], pricing: { model: 'usage_based', price: 0.10, usageUnit: 'per email' } },
      { title: 'Legal Knowledge Pack', description: 'Comprehensive legal knowledge for contract review and compliance.', category: 'knowledge', tags: ['legal', 'contracts'], pricing: { model: 'one_time', price: 199 } },
      { title: 'Free Translation Skill', description: 'Translate text across 100+ languages. Free tier included.', category: 'skill', tags: ['translation', 'free'], pricing: { model: 'free', price: 0 } },
    ];
    for (const l of listings) {
      const r = await fetch('http://localhost:8200/api/listings', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + dev.data.token },
        body: JSON.stringify(l)
      });
      if (r.ok) console.log(`  ✅ Listing: ${l.title}`);
    }
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('Demo accounts:');
  console.log('  DO:     alice@demo.com / password1');
  console.log('  Nexha:  acme@buyer.com / password1 (buyer)');
  console.log('  Nexha:  steel@supplier.com / password1 (supplier)');
  console.log('  Salar:  dev@salar.com / password1 (provider)\n');
}

main().catch(e => { console.error(e); process.exit(1); });
