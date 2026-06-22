import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

export default function PrescriptionsScreen() {
  const router = useRouter();

  // Mock data - in production, fetch from API
  const prescriptions = [
    {
      id: '1',
      doctor: 'Dr. Priya Sharma',
      specialty: 'General Physician',
      date: new Date(),
      diagnosis: 'Common Cold',
      medications: [
        { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '3 times a day' },
        { name: 'Vitamin C', dosage: '1 tablet', frequency: 'Once daily' },
      ],
    },
    {
      id: '2',
      doctor: 'Dr. Amit Kumar',
      specialty: 'Cardiologist',
      date: new Date(Date.now() - 86400000 * 5),
      diagnosis: 'Hypertension',
      medications: [
        { name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily' },
        { name: 'Losartan 50mg', dosage: '1 tablet', frequency: 'Once daily' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {prescriptions.map((rx) => (
          <TouchableOpacity
            key={rx.id}
            style={styles.prescriptionCard}
            onPress={() => router.push(`/prescription/${rx.id}`)}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.doctorName}>{rx.doctor}</Text>
                <Text style={styles.specialty}>{rx.specialty}</Text>
              </View>
              <Text style={styles.date}>{format(rx.date, 'MMM d, yyyy')}</Text>
            </View>

            {rx.diagnosis && (
              <View style={styles.diagnosis}>
                <Text style={styles.diagnosisLabel}>Diagnosis:</Text>
                <Text style={styles.diagnosisText}>{rx.diagnosis}</Text>
              </View>
            )}

            <View style={styles.medications}>
              <Text style={styles.medicationsTitle}>
                {rx.medications.length} Medication{rx.medications.length > 1 ? 's' : ''}
              </Text>
              {rx.medications.slice(0, 2).map((med, idx) => (
                <View key={idx} style={styles.medication}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDosage}>{med.dosage} - {med.frequency}</Text>
                </View>
              ))}
              {rx.medications.length > 2 && (
                <Text style={styles.moreMeds}>+{rx.medications.length - 2} more</Text>
              )}
            </View>

            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn}>
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  prescriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  specialty: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  diagnosis: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  diagnosisLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  diagnosisText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  medications: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  medicationsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  medication: {
    marginBottom: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  medDosage: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  moreMeds: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    marginRight: 8,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  shareBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
});
