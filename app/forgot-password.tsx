import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

const API_BASE = 'http://localhost:8080';
type Step = 'phone' | 'reset';
const OTP_RESEND_SECONDS = 30;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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

  const handleSendOtp = async () => {
    if (!phone.trim()) { setError('Enter your registered phone number.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const text = await res.text();
      if (!res.ok) { setError(text || 'Phone number not found.'); return; }
      setStep('reset'); startResendTimer();
    } catch { setError('Could not connect to server.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtpCode(''); setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const text = await res.text();
      if (!res.ok) { setError(text || 'Failed to resend.'); return; }
      startResendTimer();
    } catch { setError('Could not connect to server.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (otpCode.length < 6) { setError('Enter the 6-digit OTP.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, newPassword }),
      });
      const text = await res.text();
      if (!res.ok) { setError(text || 'Invalid or expired OTP.'); return; }
      setSuccess(true);
    } catch { setError('Could not connect to server.'); }
    finally { setLoading(false); }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];
  const pwRowStyle = (field: string) => [
    styles.passwordRow,
    focusedField === field && styles.inputFocused,
  ];

  if (success) {
    return (
      <View style={styles.root}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <StatusBar barStyle="light-content" />
        <View style={styles.successWrap}>
          <View style={styles.successIconBox}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSub}>Your password has been updated. You can now sign in with your new password.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')}>
            <Text style={styles.btnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🔒</Text>
          </View>
          <Text style={styles.appName}>Forgot Password</Text>
          <Text style={styles.appSub}>
            {step === 'phone' ? 'Step 1 of 2 — Enter your phone' : 'Step 2 of 2 — Reset password'}
          </Text>
        </View>

        {/* Glass card */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {step === 'phone' ? (
            <>
              <Text style={styles.stepDesc}>
                Enter your registered phone number. We'll send you a one-time code to reset your password.
              </Text>
              <TextInput
                style={inputStyle('phone')}
                placeholder="Phone number (10 digits)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={phone}
                onChangeText={v => { setPhone(v.replace(/\D/g, '')); setError(''); }}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
                maxLength={10}
              />
              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
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
                onChangeText={v => { setOtpCode(v.replace(/\D/g, '')); setError(''); }}
                onFocus={() => setFocusedField('otp')}
                onBlur={() => setFocusedField(null)}
                keyboardType="number-pad"
                maxLength={6}
              />

              <View style={pwRowStyle('newPassword')}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="New password (min 6 chars)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newPassword}
                  onChangeText={v => { setNewPassword(v); setError(''); }}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(s => !s)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showNew ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              <View style={pwRowStyle('confirmPassword')}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={confirmPassword}
                  onChangeText={v => { setConfirmPassword(v); setError(''); }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleResetPassword} disabled={loading}>
                <Text style={styles.btnText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <TouchableOpacity onPress={() => { setStep('phone'); setOtpCode(''); setError(''); }}>
                  <Text style={styles.otpLink}>Change number</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0 || loading}>
                  <Text style={[styles.otpLink, resendTimer > 0 && styles.otpLinkDim]}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
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

  blob: { position: 'absolute', borderRadius: 9999 },
  blob1: { width: 360, height: 360, backgroundColor: 'rgba(99,102,241,0.2)',  top: -100, right: -80 },
  blob2: { width: 280, height: 280, backgroundColor: 'rgba(139,92,246,0.15)', bottom: 40,  left:  -80 },
  blob3: { width: 180, height: 180, backgroundColor: 'rgba(67,56,202,0.12)',  top: '38%', right: -50 },

  brand: { alignItems: 'center', paddingTop: 60, paddingBottom: 28 },
  logoBox: {
    width: 74, height: 74, borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.22)',
    borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.55)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  logoIcon: { fontSize: 34 },
  appName: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginBottom: 6 },
  appSub: { fontSize: 12, color: 'rgba(255,255,255,0.38)' },

  card: {
    marginHorizontal: 18, marginBottom: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 28, padding: 28, overflow: 'hidden',
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
  backBtn: { marginBottom: 16, marginTop: 8 },
  backText: { color: '#a5b4fc', fontSize: 13, fontWeight: '500' },
  stepDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 20, marginBottom: 16 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, color: '#fff', fontSize: 14,
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12,
  },
  inputFocused: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 10 },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingHorizontal: 18, marginBottom: 12,
  },
  passwordInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 14 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 14 },
  eyeText: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },

  otpBadge: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    borderRadius: 10, padding: 11, marginBottom: 12,
  },
  otpBadgeText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  otpPhone: { color: '#a5b4fc', fontWeight: '700' },

  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
    borderRadius: 10, padding: 11, marginBottom: 12,
  },
  errorText: { color: '#f87171', fontSize: 12, lineHeight: 18 },

  btn: {
    backgroundColor: '#6d28d9', borderRadius: 14,
    paddingVertical: 17, alignItems: 'center', marginBottom: 8,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 14,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },

  resendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 },
  otpLink: { color: '#a5b4fc', fontSize: 12, fontWeight: '500' },
  otpLinkDim: { color: 'rgba(255,255,255,0.25)' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  dividerText: { color: 'rgba(255,255,255,0.28)', fontSize: 12, paddingHorizontal: 14 },

  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  footerLink: { color: '#a5b4fc', fontSize: 13, fontWeight: '700' },

  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successIconBox: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 2, borderColor: 'rgba(99,102,241,0.45)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
  },
  successCheck: { fontSize: 38, color: '#a5b4fc' },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 10 },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
});
