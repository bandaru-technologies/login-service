import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

const API_BASE = 'http://localhost:8080';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const set = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
    setServerError('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.username.trim()) e.username = 'Username is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.phone.trim()) e.phone = 'Phone is required.';
    else if (!/^[0-9]{10}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit number.';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true); setServerError('');
    try {
      const { confirmPassword, ...payload } = form;
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) { setServerError(text || 'Registration failed.'); return; }
      setSuccess(true);
    } catch { setServerError('Could not connect to server.'); }
    finally { setLoading(false); }
  };

  const inputStyle = (field: string) => [
    styles.input,
    errors[field] ? styles.inputErr : null,
    focusedField === field && styles.inputFocused,
  ];
  const pwRowStyle = (field: string) => [
    styles.passwordRow,
    errors[field] ? styles.inputErr : null,
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
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successSub}>You can now sign in with your credentials.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')}>
            <Text style={styles.btnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />

      {/* Background blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>📍</Text>
          </View>
          <Text style={styles.appName}>LocalServices</Text>
          <Text style={styles.appSub}>Create your free account</Text>
        </View>

        {/* Glass card */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.cardTitle}>Create Account</Text>
          <Text style={styles.cardSub}>FILL IN YOUR DETAILS</Text>

          <TextInput
            style={inputStyle('username')}
            placeholder="Username"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={form.username}
            onChangeText={v => set('username', v)}
            onFocus={() => setFocusedField('username')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.username ? <Text style={styles.error}>{errors.username}</Text> : null}

          <TextInput
            style={inputStyle('email')}
            placeholder="Email address"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={form.email}
            onChangeText={v => set('email', v)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

          <TextInput
            style={inputStyle('phone')}
            placeholder="Phone number (10 digits)"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={form.phone}
            onChangeText={v => set('phone', v.replace(/\D/g, ''))}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            keyboardType="phone-pad"
            maxLength={10}
          />
          {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}

          <View style={pwRowStyle('password')}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password (min 6 chars)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={form.password}
              onChangeText={v => set('password', v)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

          <View style={pwRowStyle('confirmPassword')}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={form.confirmPassword}
              onChangeText={v => set('confirmPassword', v)}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}

          {serverError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
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
  blob3: { width: 180, height: 180, backgroundColor: 'rgba(67,56,202,0.12)',  top: '35%', left:  -40 },

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
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.6, marginBottom: 5 },
  appSub: { fontSize: 13, color: 'rgba(255,255,255,0.38)' },

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
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 5, marginTop: 10 },
  cardSub: { fontSize: 10, color: 'rgba(255,255,255,0.28)', textAlign: 'center', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 22 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, color: '#fff', fontSize: 14,
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 6,
  },
  inputFocused: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' },
  inputErr: { borderColor: 'rgba(248,113,113,0.5)' },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingHorizontal: 18, marginBottom: 6,
  },
  passwordInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 14 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 14 },
  eyeText: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },
  error: { color: '#f87171', fontSize: 11, marginBottom: 8, paddingLeft: 4 },

  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
    borderRadius: 10, padding: 11, marginTop: 4, marginBottom: 8,
  },
  errorText: { color: '#f87171', fontSize: 12, lineHeight: 18 },

  btn: {
    backgroundColor: '#6d28d9', borderRadius: 14,
    paddingVertical: 17, alignItems: 'center', marginTop: 8, marginBottom: 8,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 14,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.6 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
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
  successIconText: { fontSize: 38, color: '#a5b4fc' },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 10 },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
});
