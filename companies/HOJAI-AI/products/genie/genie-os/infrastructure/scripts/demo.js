#!/usr/bin/env node
// End-to-end demo: showcase the entire ecosystem
const INTERNAL = 'hojai-internal-service-token-change-me';
const h = { 'content-type': 'application/json' };

async function call(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...h, ...(opts.headers || {}) } });
  return await r.json();
}

async function step(num, title) {
  console.log(`\n${num}. ${title}\n${'─'.repeat(60)}`);
}

async function main() {
  console.log('\n🎬 HOJAI Ecosystem — End-to-End Demo\n');

  // Step 1: Verify all services healthy
  await step(1, 'Checking all 20 services are healthy');
  const services = [
    { name: 'CorpID', url: 'http://localhost:7001/health' },
    { name: 'TwinOS', url: 'http://localhost:7002/health' },
    { name: 'MemoryOS', url: 'http://localhost:7003/health' },
    { name: 'GoalOS', url: 'http://localhost:7004/health' },
    { name: 'PolicyOS', url: 'http://localhost:7005/health' },
    { name: 'SkillOS', url: 'http://localhost:7006/health' },
    { name: 'FlowOS', url: 'http://localhost:7007/health' },
    { name: 'Genie', url: 'http://localhost:7100/health' },
    { name: 'Sutar', url: 'http://localhost:7200/health' },
    { name: 'AgentOS', url: 'http://localhost:7300/health' },
    { name: 'DO', url: 'http://localhost:8000/health' },
    { name: 'DO Wallet', url: 'http://localhost:8002/health' },
    { name: 'DO Merchant', url: 'http://localhost:8003/health' },
    { name: 'Nexha', url: 'http://localhost:8100/health' },
    { name: 'Nexha-RFQ', url: 'http://localhost:8101/health' },
    { name: 'Salar', url: 'http://localhost:8200/health' },
  ];
  let up = 0;
  for (const s of services) {
    try { const r = await call(s.url); if (r.success) { console.log(`  ✅ ${s.name}`); up++; } else console.log(`  ❌ ${s.name}`); }
    catch { console.log(`  ❌ ${s.name} (down)`); }
  }
  console.log(`\n  ${up}/${services.length} services healthy`);

  // Step 2: Sign up new user
  await step(2, 'Sign up new DO consumer');
  const email = `demo${Date.now()}@hojai.com`;
  const su = await call('http://localhost:8000/api/auth/signup', {
    method: 'POST', body: JSON.stringify({ email, password: 'demo12345', name: 'Demo User' })
  });
  if (su.success) {
    console.log(`  ✅ Created user: ${email}`);
    console.log(`     ID: ${su.data.user.id}`);
    console.log(`     CorpID: ${su.data.user.corpId}`);
  } else { console.log('  ❌ Signup failed:', su.error?.message); return; }
  const token = su.data.token;

  // Step 3: Get wallet
  await step(3, 'Check wallet (auto-created with $100 bonus)');
  // Wait a moment for wallet creation
  await new Promise(r => setTimeout(r, 500));
  const wallet = await call('http://localhost:8002/api/wallet/' + su.data.user.id, { headers: { 'x-internal-token': INTERNAL } });
  if (wallet.data) {
    const w = wallet.data;
    console.log(`  Balance: $${w.balance}`);
    console.log(`  Tier: ${w.tier.toUpperCase()}`);
    console.log(`  Points: ${w.rewardsPoints}`);
  } else {
    console.log('  (wallet not yet created, retrying...)');
    await new Promise(r => setTimeout(r, 1000));
    const w2 = await call('http://localhost:8002/api/wallet/' + su.data.user.id, { headers: { 'x-internal-token': INTERNAL } });
    if (w2.data) {
      console.log(`  Balance: $${w2.data.balance}`);
      console.log(`  Tier: ${w2.data.tier.toUpperCase()}`);
    }
  }

  // Step 4: Use agent to shop
  await step(4, 'Use Genie agent to find products');
  const shop = await call('http://localhost:8000/api/agent/action', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'shop', params: { item: 'mouse' } })
  });
  if (shop.data) {
    const d = shop.data;
    console.log(`  Agent says: "${d.agent_says}"`);
    console.log(`  Found ${d.options?.length || 0} options`);
    if (d.options && d.options[0]) console.log(`  ⭐ Recommended: ${d.options[0].name} - $${d.options[0].price}`);
  }

  // Step 5: Browse Salar marketplace
  await step(5, 'Browse AI marketplace (Salar)');
  const listings = await call('http://localhost:8200/api/listings?limit=5');
  if (listings.data) {
    console.log(`  Found ${listings.data.count} AI listings`);
    for (const l of listings.data.items.slice(0, 3)) {
      console.log(`     - ${l.title} (${l.category}) - ${l.pricing.model === 'free' ? 'FREE' : '$' + l.pricing.price}`);
    }
  }

  // Step 6: Check B2B
  await step(6, 'Check B2B network (Nexha)');
  const companies = await call('http://localhost:8100/api/companies');
  if (companies.data) {
    console.log(`  ${companies.data.count} verified companies in network`);
  }

  // Step 7: Goal tracking
  await step(7, 'Set a goal via GoalOS');
  const goal = await call('http://localhost:7004/api/goals', {
    method: 'POST',
    headers: { 'x-internal-token': INTERNAL, 'content-type': 'application/json' },
    body: JSON.stringify({ corpId: su.data.user.corpId, title: 'Save $1000', category: 'finance', targetValue: 1000, unit: 'USD' })
  });
  if (goal.data) console.log(`  ✅ Goal created: ${goal.data.goalId}`);

  // Step 8: Memory
  await step(8, 'Save preference to MemoryOS');
  const mem = await call('http://localhost:7003/api/memory', {
    method: 'POST',
    headers: { 'x-internal-token': INTERNAL, 'content-type': 'application/json' },
    body: JSON.stringify({ corpId: su.data.user.corpId, type: 'preference', content: 'Prefers dark mode and vegetarian food', importance: 0.9 })
  });
  if (mem.data) console.log(`  ✅ Memory saved: ${mem.data.memoryId}`);

  // Step 9: Marketplace stats
  await step(9, 'Marketplace stats');
  const stats = await call('http://localhost:8200/api/marketplace/stats');
  if (stats.success) {
    const s = stats.data;
    console.log(`  ${s.totalListings} listings`);
    console.log(`  ${s.totalProviders} providers`);
    console.log(`  ${s.totalPurchases} purchases`);
    console.log(`  $${s.totalRevenue.toFixed(2)} total revenue`);
  }

  console.log('\n🎉 Demo complete! Open http://localhost:3000 in your browser.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
