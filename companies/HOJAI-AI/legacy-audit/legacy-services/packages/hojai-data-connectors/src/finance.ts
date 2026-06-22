/**
 * RidZa Finance → Hojai AI Finance Connector
 * Privacy Tier 3
 */
export async function emitFinanceSignals(data: {
  userId: string;
  transaction: { amount: number; type: 'income' | 'expense' | 'investment' };
}): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/finance`, {
    userId: data.userId,
    transaction: data.transaction
  });
}
