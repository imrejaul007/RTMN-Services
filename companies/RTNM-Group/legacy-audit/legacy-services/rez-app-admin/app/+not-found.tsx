import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 8 }}>Page Not Found</Text>
      <Text style={{ color: '#666', marginBottom: 24, textAlign: 'center' }}>
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <Pressable
        onPress={() => router.replace('/(dashboard)')}
        style={{ backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Go to Dashboard</Text>
      </Pressable>
    </View>
  );
}
