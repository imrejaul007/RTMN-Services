/**
 * Airzy → Hojai AI Travel Connector
 * Privacy Tier 2
 */
export async function emitTravelSignals(data: {
  userId: string;
  trip: { destination: string; dates: { from: string; to: string } };
  class: string;
  loyalty: number;
}): Promise<void> {
  // Travel intent signals
  await axios.post(`${process.env.HOJAi_API_URL}/signals/travel`, data);

  // Loyalty enrichment
  await axios.post(`${process.env.HOJAi_API_URL}/signals/loyalty`, {
    userId: data.userId,
    points: data.loyalty
  });
}
