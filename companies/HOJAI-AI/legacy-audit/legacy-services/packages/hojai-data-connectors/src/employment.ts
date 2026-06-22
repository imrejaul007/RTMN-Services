/**
 * CorpPerks → Hojai AI Employment Connector
 * Privacy Tier 2
 */
export async function emitEmploymentSignals(data: {
  userId: string;
  employer: string;
  salary: number;
  role: string;
}): Promise<void> {
  await axios.post(`${process.env.HOJAi_API_URL}/signals/employment`, data);
}
