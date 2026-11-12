import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('authToken').then(token => {
      setHasToken(!!token);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#120f29' }}>
        <ActivityIndicator color="#818cf8" />
      </View>
    );
  }

  return hasToken ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
