import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';

export default function Index() {
  const { user } = useAuthStore();
  
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }
  
  return <Redirect href="/welcome" />;
}
