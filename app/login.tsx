import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:8080';
type Mode = 'password' | 'otp';
type OtpStep = 'phone' | 'code';
const OTP_RESEND_SECONDS = 30;

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('phone');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendTimer(OTP_RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const switchMode = (m: Mode) => {
    setMode(m); setPassError(''); setOtpError('');
    setOtpStep('phone'); setOtpCode('');
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(0); setFocusedField(null);
  };

  const handlePasswordLogin = async () => {
    if (!username.trim()) { setPassError('Enter your username.'); return; }
    if (!password.trim()) { setPassError('Enter your password.'); return; }
    setPassLoading(true); setPassError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) { setPassError('Invalid username or password.'); return; }
      const data = await res.json();
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('username', data.username || username);
      router.replace('/(tabs)');
    } catch { setPassError('Could not connect to server.'); }
    finally { setPassLoading(false); }
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) { setOtpError('Enter your phone number.'); return; }
    setOtpLoading(true); setOtpError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const text = await res.text();
      if (!res.ok) { setOtpError(text || 'Failed to send OTP.'); return; }
      setOtpStep('code'); startResendTimer();
    } catch { setOtpError('Could not connect to server.'); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) { setOtpError('Enter the 6-digit OTP.'); return; }
    setOtpLoading(true); setOtpError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });
      if (!res.ok) { setOtpError('Invalid or expired OTP.'); return; }
      const data = await res.json();
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('username', data.username || phone);
      router.replace('/(tabs)');
    } catch { setOtpError('Could not connect to server.'); }
    finally { setOtpLoading(false); }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];
  const pwRowStyle = (field: string) => [
    styles.passwordRow,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {/* Background blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />
      <View style={[styles.blob, styles.blob4]} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoRing}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>📍</Text>
            </View>
          </View>
          <Text style={styles.appName}>LocalServices</Text>
          <Text style={styles.appSub}>Discover services near you</Text>
        </View>

        {/* Glass card */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSub}>SIGN IN TO CONTINUE</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, mode === 'password' && styles.tabActive]} onPress={() => switchMode('password')}>
              <Text style={[styles.tabText, mode === 'password' && styles.tabTextActive]}>🔑  Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'otp' && styles.tabActive]} onPress={() => switchMode('otp')}>
              <Text style={[styles.tabText, mode === 'otp' && styles.tabTextActive]}>📱  Phone OTP</Text>
            </TouchableOpacity>
          </View>

          {mode === 'password' ? (
            <>
              <TextInput
                style={inputStyle('username')}
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={username}
                onChangeText={v => { setUsername(v); setPassError(''); }}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={pwRowStyle('password')}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={v => { setPassword(v); setPassError(''); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              {passError ? <View style={styles.errorBox}><Text style={styles.errorText}>{passError}</Text></View> : null}
              <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/forgot-password')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, passLoading && styles.btnDisabled]} onPress={handlePasswordLogin} disabled={passLoading}>
                <Text style={styles.btnText}>{passLoading ? 'Signing in...' : 'Sign In'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {otpStep === 'phone' ? (
                <>
                  <TextInput
                    style={inputStyle('phone')}
                    placeholder="Phone number (10 digits)"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={phone}
                    onChangeText={v => { setPhone(v.replace(/\D/g, '')); setOtpError(''); }}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  {otpError ? <View style={styles.errorBox}><Text style={styles.errorText}>{otpError}</Text></View> : null}
                  <TouchableOpacity style={[styles.btn, otpLoading && styles.btnDisabled]} onPress={handleSendOtp} disabled={otpLoading}>
                    <Text style={styles.btnText}>{otpLoading ? 'Sending...' : 'Send OTP'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.otpBadge}>
                    <Text style={styles.otpBadgeText}>OTP sent to <Text style={styles.otpPhone}>{phone}</Text></Text>
                  </View>
                  <TextInput
                    style={[inputStyle('otp'), styles.otpInput]}
                    placeholder="• • • • • •"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={otpCode}
                    onChangeText={v => { setOtpCode(v.replace(/\D/g, '')); setOtpError(''); }}
                    onFocus={() => setFocusedField('otp')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  {otpError ? <View style={styles.errorBox}><Text style={styles.errorText}>{otpError}</Text></View> : null}
                  <TouchableOpacity style={[styles.btn, otpLoading && styles.btnDisabled]} onPress={handleVerifyOtp} disabled={otpLoading}>
                    <Text style={styles.btnText}>{otpLoading ? 'Verifying...' : 'Verify & Login'}</Text>
                  </TouchableOpacity>
                  <View style={styles.otpFooter}>
                    <TouchableOpacity onPress={() => { setOtpStep('phone'); setOtpCode(''); setOtpError(''); }}>
                      <Text style={styles.otpLink}>Change number</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { if (resendTimer === 0) handleSendOtp(); }} disabled={resendTimer > 0}>
                      <Text style={[styles.otpLink, resendTimer > 0 && styles.otpLinkDim]}>
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.footerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09071e' },
  scroll: { flexGrow: 1, paddingBottom: 48 },

  /* Background blobs */
  blob: { position: 'absolute', borderRadius: 9999 },
  blob1: { width: 380, height: 380, backgroundColor: 'rgba(99,102,241,0.2)',  top: -120, right: -100 },
  blob2: { width: 300, height: 300, backgroundColor: 'rgba(139,92,246,0.16)', bottom: 30,  left:  -90 },
  blob3: { width: 200, height: 200, backgroundColor: 'rgba(67,56,202,0.12)',  top: '38%', right: -50 },
  blob4: { width: 160, height: 160, backgroundColor: 'rgba(124,58,237,0.1)',  top: '55%', left:  -40 },

  /* Brand */
  brand: { alignItems: 'center', paddingTop: 64, paddingBottom: 32 },
  logoRing: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: 'rgba(99,102,241,0.07)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  logoBox: {
    width: 76, height: 76, borderRadius: 23,
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.6)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 14,
  },
  logoIcon: { fontSize: 36 },
  appName: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginBottom: 6 },
  appSub: { fontSize: 13, color: 'rgba(255,255,255,0.36)' },

  /* Glass card */
  card: {
    marginHorizontal: 18, marginBottom: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 28, padding: 28,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22, shadowRadius: 40, elevation: 24,
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: '#7c3aed',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 5, marginTop: 10 },
  cardSub: { fontSize: 10, color: 'rgba(255,255,255,0.28)', textAlign: 'center', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 24 },

  /* Tabs */
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 30, padding: 4, marginBottom: 22, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 26, alignItems: 'center' },
  tabActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  tabText: { color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* Inputs */
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, color: '#fff', fontSize: 14,
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12,
  },
  inputFocused: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingHorizontal: 18, marginBottom: 12,
  },
  passwordInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 14 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 14 },
  eyeText: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },

  /* Error */
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
    borderRadius: 10, padding: 11, marginBottom: 12,
  },
  errorText: { color: '#f87171', fontSize: 12, lineHeight: 18 },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { color: '#a5b4fc', fontSize: 12, fontWeight: '500' },

  /* Button */
  btn: {
    backgroundColor: '#6d28d9',
    borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', marginBottom: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 14,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },

  /* OTP */
  otpBadge: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    borderRadius: 10, padding: 11, marginBottom: 12,
  },
  otpBadgeText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  otpPhone: { color: '#a5b4fc', fontWeight: '700' },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 10 },
  otpFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 2 },
  otpLink: { color: '#a5b4fc', fontSize: 12, fontWeight: '500' },
  otpLinkDim: { color: 'rgba(255,255,255,0.25)' },

  /* Divider */
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  dividerText: { color: 'rgba(255,255,255,0.28)', fontSize: 12, paddingHorizontal: 14 },

  /* Footer */
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  footerLink: { color: '#a5b4fc', fontSize: 13, fontWeight: '700' },
});
