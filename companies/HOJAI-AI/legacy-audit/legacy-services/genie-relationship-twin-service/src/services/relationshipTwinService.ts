/**
 * Relationship Twin Service
 */
import { v4 as uuidv4 } from 'uuid';

const relationships = new Map<string, Relationship>();

export async function addRelationship(userId: string, data: {
  person_id: string; name: string; type: string; relationship: string;
}): Promise<Relationship> {
  const rel: Relationship = {
    id: uuidv4(),
    user_id: userId,
    person_id: data.person_id,
    name: data.name,
    type: data.type as any,
    relationship: data.relationship,
    importance: 50,
    health_score: 100,
    last_interaction: new Date().toISOString(),
    interactions: [],
    notes: '',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  relationships.set(rel.id, rel);
  return rel;
}

export async function getRelationships(userId: string): Promise<Relationship[]> {
  return Array.from(relationships.values()).filter(r => r.user_id === userId);
}

export async function addInteraction(relId: string, userId: string, interaction: {
  type: string; notes?: string; duration_minutes?: number;
}): Promise<Relationship | null> {
  const rel = Array.from(relationships.values()).find(r => r.id === relId && r.user_id === userId);
  if (!rel) return null;

  rel.interactions.push({
    id: uuidv4(),
    type: interaction.type as any,
    date: new Date().toISOString(),
    duration_minutes: interaction.duration_minutes,
    notes: interaction.notes,
  });
  rel.last_interaction = new Date().toISOString();
  rel.updated_at = new Date().toISOString();

  // Update health score based on recency
  const daysSince = (Date.now() - new Date(rel.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
  rel.health_score = Math.max(0, 100 - daysSince * 5);

  relationships.set(rel.id, rel);
  return rel;
}

export async function getSummary(userId: string): Promise<RelationshipSummary> {
  const rels = await getRelationships(userId);
  return {
    total_relationships: rels.length,
    healthy_count: rels.filter(r => r.health_score > 70).length,
    at_risk_count: rels.filter(r => r.health_score >= 30 && r.health_score <= 70).length,
    neglected_count: rels.filter(r => r.health_score < 30).length,
    top_relationships: rels.sort((a, b) => b.importance - a.importance).slice(0, 5),
    needs_attention: rels.filter(r => r.health_score < 50),
  };
}
