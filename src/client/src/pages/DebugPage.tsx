// @ts-nocheck
import { useState } from 'react';
import { api, userAPI, cycleAPI, appointmentAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCycleStore } from '../stores/cycleStore';

export default function DebugPage() {
  const user = useAuthStore(s => s.user);
  const cycle = useCycleStore();
  const token = localStorage.getItem('sb_token');
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const log = (msg: string) => setResults(prev => [...prev, msg]);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    const L = (msg: string) => setResults(prev => [...prev, msg]);

    L('═══ SheBloom Debug v2.2 ═══');
    L('Time: ' + new Date().toLocaleString());
    L('Token: ' + (token ? token.substring(0, 20) + '...' : '❌ NONE'));
    L('Auth store user: ' + JSON.stringify(user));
    L('Cycle store: cycleDay=' + cycle.cycleDay + ' phase=' + cycle.phase + ' goal=' + cycle.goal);
    L('API base: ' + (api.defaults.baseURL || 'NOT SET'));
    L('');

    // Test 1: Server health
    L('── TEST 1: Backend Health (/api/v1/debug) ──');
    try {
      const res = await api.get('/debug');
      L('✅ STATUS: ' + res.status);
      L('   ' + JSON.stringify(res.data));
    } catch (err) {
      L('❌ ' + (err.response?.status || 'NETWORK ERROR') + ': ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 2: Profile
    L('');
    L('── TEST 2: GET /users/me ──');
    try {
      const res = await userAPI.me();
      const d = res.data.data || res.data;
      L('✅ STATUS: ' + res.status);
      L('   name: ' + d?.fullName + ', email: ' + d?.email + ', phone: ' + d?.phone);
      L('   profile: cycleLength=' + d?.profile?.cycleLength + ' periodLength=' + d?.profile?.periodLength);
    } catch (err) {
      L('❌ ' + (err.response?.status || 'NETWORK') + ': ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 3: Save email
    L('');
    L('── TEST 3: PUT /users/me (save email) ──');
    try {
      const testEmail = 'debug-test-' + Date.now() + '@test.com';
      const res = await userAPI.update({ email: testEmail });
      const d = res.data.data || res.data;
      L('✅ Saved email: ' + d?.email);
      if (d?.email === testEmail) L('   ✅ EMAIL PERSISTS CORRECTLY');
      else L('   ❌ Email did NOT save (backend whitelist issue)');
    } catch (err) {
      L('❌ ' + (err.response?.status || 'NETWORK') + ': ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 4: Verify email persisted
    L('');
    L('── TEST 4: GET /users/me (verify email) ──');
    try {
      const res = await userAPI.me();
      const d = res.data.data || res.data;
      L('✅ email now: ' + d?.email);
    } catch (err) {
      L('❌ ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 5: Cycle predictions
    L('');
    L('── TEST 5: GET /cycles/predict ──');
    try {
      const res = await cycleAPI.predict();
      const d = res.data.data;
      L('✅ STATUS: ' + res.status);
      if (d?.cycleDay) L('   cycleDay=' + d.cycleDay + ' phase=' + d.phase + ' daysUntilPeriod=' + d.daysUntilPeriod);
      else L('   ⚠️ ' + JSON.stringify(d) + ' (need to log first period)');
    } catch (err) {
      L('❌ ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 6: Log a period
    L('');
    L('── TEST 6: POST /cycles/log (log period) ──');
    try {
      const res = await cycleAPI.log({ startDate: new Date().toISOString().split('T')[0] });
      L('✅ STATUS: ' + res.status);
      L('   Created: ' + JSON.stringify(res.data.data));
    } catch (err) {
      L('❌ ' + (err.response?.status || 'NETWORK') + ': ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 7: List cycles
    L('');
    L('── TEST 7: GET /cycles ──');
    try {
      const res = await cycleAPI.list();
      const d = res.data.data || [];
      L('✅ Found ' + d.length + ' cycle(s)');
      if (d.length > 0) L('   Latest: ' + d[0].startDate);
    } catch (err) {
      L('❌ ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 8: Appointments
    L('');
    L('── TEST 8: GET /appointments ──');
    try {
      const res = await appointmentAPI.list();
      const d = res.data.data || [];
      L('✅ Found ' + d.length + ' appointment(s) in DB');
    } catch (err) {
      L('❌ ' + JSON.stringify(err.response?.data || err.message));
    }

    // Test 9: LocalStorage bookings
    L('');
    L('── TEST 9: localStorage bookings ──');
    try {
      const local = JSON.parse(localStorage.getItem('sb_bookings') || '[]');
      L('Found ' + local.length + ' local booking(s)');
    } catch { L('No local bookings'); }

    // Test 10: Save cycle settings
    L('');
    L('── TEST 10: PUT /users/me/profile (cycle settings) ──');
    try {
      const res = await userAPI.updateProfile({ cycleLength: 30, periodLength: 6 });
      L('✅ STATUS: ' + res.status);
      L('   ' + JSON.stringify(res.data.data || res.data));
    } catch (err) {
      L('❌ ' + (err.response?.status || 'NETWORK') + ': ' + JSON.stringify(err.response?.data || err.message));
    }

    L('');
    L('═══ ALL TESTS COMPLETE ═══');
    setRunning(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 11, background: '#0a0a1a', color: '#00ff88', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff', fontSize: 18, marginBottom: 4 }}>SheBloom Debug Console v2.2</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>Tests actual backend API endpoints</p>
      <button onClick={runTests} disabled={running}
        style={{ padding: '12px 32px', background: running ? '#333' : '#00ff88', color: '#000', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: running ? 'wait' : 'pointer', marginBottom: 16, fontSize: 14 }}>
        {running ? '⏳ Running...' : '▶ Run All Tests'}
      </button>
      <div style={{ background: '#111', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', maxHeight: '75vh', overflow: 'auto', lineHeight: 1.6 }}>
        {results.length === 0 ? 'Click "Run All Tests" to diagnose your app...\n\nThis will test:\n• Backend connection\n• Profile save (including email)\n• Cycle predictions\n• Period logging\n• Appointment loading\n• Cycle settings persistence' : results.join('\n')}
      </div>
    </div>
  );
}
