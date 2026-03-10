// @ts-nocheck
import { useState } from 'react';
import { api, userAPI, cycleAPI, appointmentAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function DebugPage() {
  const user = useAuthStore(s => s.user);
  const token = localStorage.getItem('sb_token');
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const log = (msg: string) => setResults(prev => [...prev, msg]);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    
    log('=== SheBloom Debug v2.1 ===');
    log('Token: ' + (token ? token.substring(0, 20) + '...' : 'NONE'));
    log('User in store: ' + JSON.stringify(user));
    log('API Base: ' + (api.defaults.baseURL || 'NOT SET'));
    log('');

    // Test 1: GET /users/me
    log('--- TEST 1: GET /users/me ---');
    try {
      const res = await userAPI.me();
      log('STATUS: ' + res.status);
      log('RESPONSE: ' + JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      log('ERROR: ' + (err.response?.status || 'network') + ' - ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 2: PUT /users/me with email
    log('');
    log('--- TEST 2: PUT /users/me (save email) ---');
    try {
      const res = await userAPI.update({ email: 'test-debug@shebloom.com' });
      log('STATUS: ' + res.status);
      log('RESPONSE: ' + JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      log('ERROR: ' + (err.response?.status || 'network') + ' - ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 3: GET /users/me again - does email persist?
    log('');
    log('--- TEST 3: GET /users/me (verify email saved) ---');
    try {
      const res = await userAPI.me();
      const d = res.data.data || res.data;
      log('STATUS: ' + res.status);
      log('email field: ' + JSON.stringify(d?.email));
      log('fullName: ' + JSON.stringify(d?.fullName));
      if (d?.email === 'test-debug@shebloom.com') {
        log('✅ EMAIL PERSISTED CORRECTLY');
      } else {
        log('❌ EMAIL DID NOT PERSIST - backend is dropping it');
      }
    } catch (err: any) {
      log('ERROR: ' + (err.response?.status || 'network') + ' - ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 4: Cycle predictions
    log('');
    log('--- TEST 4: GET /cycles/predict ---');
    try {
      const res = await cycleAPI.predict();
      log('STATUS: ' + res.status);
      log('RESPONSE: ' + JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      log('ERROR: ' + (err.response?.status || 'network') + ' - ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 5: Log a period
    log('');
    log('--- TEST 5: POST /cycles/log (log period) ---');
    try {
      const res = await cycleAPI.log({ startDate: '2025-03-01' });
      log('STATUS: ' + res.status);
      log('RESPONSE: ' + JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      log('ERROR: ' + (err.response?.status || 'network') + ' - ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 6: List appointments
    log('');
    log('--- TEST 6: GET /appointments ---');
    try {
      const res = await appointmentAPI.list();
      log('STATUS: ' + res.status);
      log('RESPONSE: ' + JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      log('ERROR: ' + (err.response?.status || 'network') + ' - ' + JSON.stringify(err.response?.data || err.message));
    }

    log('');
    log('=== TESTS COMPLETE ===');
    setRunning(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 12, background: '#1a1a2e', color: '#0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', fontSize: 18 }}>SheBloom Debug Console v2.1</h1>
      <p style={{ color: '#888', marginBottom: 16 }}>This page tests your actual backend API</p>
      
      <button onClick={runTests} disabled={running}
        style={{ padding: '12px 24px', background: running ? '#555' : '#00ff88', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16 }}>
        {running ? 'Running...' : 'Run All Tests'}
      </button>

      <div style={{ background: '#000', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', maxHeight: '70vh', overflow: 'auto' }}>
        {results.length === 0 ? 'Click "Run All Tests" to start...' : results.join('\n')}
      </div>
    </div>
  );
}
