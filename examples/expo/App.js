import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as CoreWatch from '@dynamicore/corewatch';

import { captured, subscribe } from './instrument';

function Broken() {
  const user = undefined;
  return <Text>{user.name}</Text>;
}

function Button({ label, onPress }) {
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityLabel={label}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [, setTick] = useState(0);
  const [broken, setBroken] = useState(false);
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CoreWatch · Expo</Text>
      <Button label="Error manejado" onPress={() => {
        try {
          JSON.parse('{ no es json');
        } catch (e) {
          CoreWatch.captureException(e, { feature: 'test', action: 'parse', password: 'secreto' });
        }
      }} />
      <Button label="Promesa sin catch" onPress={() => { Promise.reject(new Error('Pago rechazado por el banco')); }} />
      <Button label="Fetch 404 + mensaje" onPress={async () => {
        await fetch('https://httpbin.org/status/404').catch(() => {});
        CoreWatch.logger.warn('Respuesta lenta del servidor', { durationMs: 5300 });
      }} />
      <Button label="Romper render" onPress={() => setBroken(true)} />
      <Button label="Error no capturado" onPress={() => {
        setTimeout(() => {
          throw new Error('Fallo no capturado en un timer');
        }, 0);
      }} />
      {broken && (
        <CoreWatch.ErrorBoundary onReset={() => setBroken(false)}>
          <Broken />
        </CoreWatch.ErrorBoundary>
      )}
      <Text style={styles.subtitle}>Capturados: {captured.length}</Text>
      <ScrollView style={styles.list}>
        {captured.map((e) => (
          <View key={e.eventId} style={styles.event}>
            <Text style={styles.eventTitle}>{e.level.toUpperCase()} · {e.mechanism}</Text>
            <Text style={styles.eventText}>{e.message}</Text>
            <Text style={styles.eventMeta}>
              {e.context.os?.name} {e.context.os?.version} · {e.context.runtime?.engine} · {e.context.app?.name} {e.context.app?.version} ({e.context.app?.build}) · project {e.project}
            </Text>
            <Text style={styles.eventMeta}>extra: {JSON.stringify(e.extra)}</Text>
            <Text style={styles.eventMeta}>
              breadcrumbs: {e.breadcrumbs.slice(-4).map((b) => `${b.category}: ${b.message}`).join(' | ')}
            </Text>
          </View>
        ))}
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 64, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  button: { backgroundColor: '#6a5ae0', borderRadius: 10, padding: 12, marginVertical: 4 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  list: { flex: 1, marginTop: 8 },
  event: { borderWidth: 1, borderColor: '#e0dce5', borderRadius: 8, padding: 8, marginBottom: 8 },
  eventTitle: { fontWeight: '700', fontSize: 12 },
  eventText: { fontSize: 12 },
  eventMeta: { fontSize: 10, color: '#80708f' },
});
