import { createInMemorySubscriptionStore } from '/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/agentfin/subscription-adapter/src/store';
import { SubscriptionService } from '/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/agentfin/subscription-adapter/src/service';

(async () => {
  const store = createInMemorySubscriptionStore();
  const svc = new SubscriptionService(store, { renewalGraceSeconds: 60 });
  const sub = await svc.create({
    businessId: 'biz_1', agentId: 'agt_1', corpidId: null,
    vendorId: 'vnd_openai', vendorName: 'OpenAI', planId: 'plan_pro', planName: 'Pro',
    amount: 2000, currency: 'USD', interval: 'monthly', walletId: 'wal_1',
    startNow: true, createdBy: 'agt_1',
  });
  console.log('after create:', sub.status, sub.updatedAt);
  await (store as any).update(sub.id, { status: 'past_due', updatedAt: new Date(Date.now() - 120_000).toISOString() });
  const fresh = await store.getById(sub.id);
  console.log('after update:', fresh?.status, fresh?.updatedAt);
  const past = await store.listPastDue(100);
  console.log('past:', past.length, past[0]?.status, past[0]?.updatedAt);
  const now = new Date();
  const failMs = Date.parse(past[0]!.updatedAt);
  console.log('diff:', now.getTime() - failMs, 'grace:', 60_000);
  const count = await svc.sweepExpired();
  console.log('count:', count);
})();
