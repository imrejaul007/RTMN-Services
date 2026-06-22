import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

export default function AppointmentsScreen() {
  const router = useRouter();

  // Mock data - in production, fetch from API
  const appointments = [
    {
      id: '1',
      doctor: 'Dr. Priya Sharma',
      specialty: 'General Physician',
      date: new Date(),
      time: '10:30 AM',
      status: 'confirmed',
    },
    {
      id: '2',
      doctor: 'Dr. Amit Kumar',
      specialty: 'Cardiologist',
      date: new Date(Date.now() + 86400000 * 3),
      time: '2:00 PM',
      status: 'scheduled',
    },
    {
      id: '3',
      doctor: 'Dr. Neha Gupta',
      specialty: 'Dermatologist',
      date: new Date(Date.now() - 86400000 * 7),
      time: '11:00 AM',
      status: 'completed',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#dcfce7', text: '#166534' };
      case 'scheduled':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'completed':
        return { bg: '#f3f4f6', text: '#374151' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {appointments.map((apt) => {
          const statusColors = getStatusColor(apt.status);
          return (
            <TouchableOpacity
              key={apt.id}
              style={styles.appointmentCard}
              onPress={() => router.push(`/appointment/${apt.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.avatarText}>
                    {apt.doctor.split(' ').slice(-1)[0][0]}
                  </Text>
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{apt.doctor}</Text>
                  <Text style={styles.specialty}>{apt.specialty}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {apt.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.dateTime}>
                  <Text style={styles.dateText}>
                    {format(apt.date, 'EEE, MMM d')}
                  </Text>
                  <Text style={styles.timeText}>{apt.time}</Text>
                </View>
              </View>

              {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]}>
                    <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/appointments/book')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  appointmentCard: {
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
    alignItems: 'center',
    marginBottom: 16,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dateTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionBtnPrimary: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  actionBtnTextPrimary: {
    color: '#dc2626',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});
