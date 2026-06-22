/**
 * StayOwn → Hojai AI Hospitality Connector
 */
export async function emitHospitalitySignals(data: {
  userId: string;
  stay: { hotel: string; dates: { checkin: string; checkout: string } };
  spend: number;
}): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/hospitality`, {
    userId: data.userId,
    booking: data.stay,
    value: data.spend
  });
}
