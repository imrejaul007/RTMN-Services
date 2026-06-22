import OpenAI from 'openai';
import { config } from '../config';
import { AgentConfig } from '../models';
import { AgentType } from '../types';

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

export class PharmacistAgent {
  private openai: OpenAI;
  private agentType: AgentType = 'pharmacist';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async checkInteractions(
    medications: string[],
    patientAllergies: string[]
  ): Promise<{
    interactions: DrugInteraction[];
    allergyWarnings: string[];
    alternatives: Record<string, string[]>;
  }> {
    const result = {
      interactions: [] as DrugInteraction[],
      allergyWarnings: [] as string[],
      alternatives: {} as Record<string, string[]>,
    };

    // Check for common interactions
    const commonInteractions: Record<string, DrugInteraction[]> = {
      'warfarin': [
        { drug1: 'warfarin', drug2: 'aspirin', severity: 'severe', description: 'Increased bleeding risk' },
        { drug1: 'warfarin', drug2: 'ibuprofen', severity: 'severe', description: 'Increased bleeding risk' },
      ],
      'metformin': [
        { drug1: 'metformin', drug2: 'alcohol', severity: 'moderate', description: 'Increased lactic acidosis risk' },
      ],
      'lisinopril': [
        { drug1: 'lisinopril', drug2: 'potassium', severity: 'moderate', description: 'Hyperkalemia risk' },
      ],
      'amlodipine': [
        { drug1: 'amlodipine', drug2: 'simvastatin', severity: 'mild', description: 'May increase statin levels' },
      ],
    };

    const lowerMeds = medications.map((m) => m.toLowerCase());

    for (const [drug, interactions] of Object.entries(commonInteractions)) {
      if (lowerMeds.some((m) => m.includes(drug))) {
        for (const interaction of interactions) {
          if (lowerMeds.some((m) => m.includes(interaction.drug2))) {
            result.interactions.push(interaction);
          }
        }
      }
    }

    // Check allergies
    const allergyMap: Record<string, string[]> = {
      'penicillin': ['amoxicillin', 'ampicillin', 'penicillin'],
      'sulfa': ['sulfamethoxazole', 'sulfasalazine'],
      'aspirin': ['aspirin', 'salicylate'],
    };

    for (const [allergy, related] of Object.entries(allergyMap)) {
      if (patientAllergies.some((a) => a.toLowerCase().includes(allergy))) {
        for (const med of medications) {
          if (related.some((r) => med.toLowerCase().includes(r))) {
            result.allergyWarnings.push(`${med} may cause allergic reaction (patient allergic to ${allergy})`);
          }
        }
      }
    }

    return result;
  }

  async suggestAlternatives(
    medication: string,
    reason: string
  ): Promise<string[]> {
    const alternatives: Record<string, Record<string, string[]>> = {
      'metformin': {
        'side_effects': ['Sitagliptin', 'Vildagliptin', 'Empagliflozin'],
        'contraindicated': ['Glipizide', 'Gliclazide', 'Glimepiride'],
      },
      'atorvastatin': {
        'side_effects': ['Rosuvastatin', 'Pravastatin', 'Simvastatin'],
        'contraindicated': ['High-intensity statin alternative: Ezetimibe + Fenofibrate'],
      },
      'omeprazole': {
        'side_effects': ['Pantoprazole', 'Esomeprazole', 'Rabeprazole'],
        'contraindicated': ['H2 blockers like Ranitidine'],
      },
    };

    const lowerMed = medication.toLowerCase();

    for (const [drug, reasons] of Object.entries(alternatives)) {
      if (lowerMed.includes(drug)) {
        if (reasons[reason]) {
          return reasons[reason];
        }
      }
    }

    return [];
  }

  async getDosageInfo(medication: string): Promise<{
    usualDose: string;
    maxDose: string;
    frequency: string[];
    withFood: boolean;
  }> {
    // Common dosage information
    const dosageInfo: Record<string, any> = {
      'paracetamol': {
        usualDose: '500mg - 1000mg',
        maxDose: '4000mg',
        frequency: ['Every 4-6 hours', 'Maximum 4 doses per day'],
        withFood: false,
      },
      'ibuprofen': {
        usualDose: '200mg - 400mg',
        maxDose: '1200mg (OTC), 3200mg (prescription)',
        frequency: ['Every 6-8 hours with food'],
        withFood: true,
      },
      'metformin': {
        usualDose: '500mg - 1000mg',
        maxDose: '2550mg',
        frequency: ['Twice daily with meals'],
        withFood: true,
      },
      'amlodipine': {
        usualDose: '5mg',
        maxDose: '10mg',
        frequency: ['Once daily'],
        withFood: false,
      },
    };

    const lowerMed = medication.toLowerCase();

    for (const [drug, info] of Object.entries(dosageInfo)) {
      if (lowerMed.includes(drug)) {
        return info;
      }
    }

    return {
      usualDose: 'Consult prescribing physician',
      maxDose: 'Consult prescribing physician',
      frequency: ['As directed by physician'],
      withFood: false,
    };
  }
}

export const pharmacistAgent = new PharmacistAgent();
