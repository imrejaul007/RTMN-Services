/**
 * ReZ Ride → Hojai AI Mobility Connector
 */
export async function emitMobilitySignals(data: {
  userId: string;
  rideType: 'pickup' | 'drop' | 'schedule';
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
}): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/mobility`, {
    userId: data.userId,
    rideType: data.rideType,
    location: data.pickup
  });
}
