/**
 * BuzzLocal → Hojai AI Local Intelligence Connector
 */
export async function emitLocalSignals(data: {
  userId: string;
  action: 'visit' | 'checkin' | 'review';
  venue: { name: string; category: string; location: any };
}): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/local`, {
    userId: data.userId,
    venue: data.venue
  });
}
