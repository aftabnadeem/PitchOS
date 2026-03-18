import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      Alert.alert('Login Failed', error.message)
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a0f1e', '#0d1b2a', '#0a0f1e']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SALES OS</Text>
          </View>
          <Text style={styles.title}>PitchOS</Text>
          <Text style={styles.subtitle}>Your mobile sales command center</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor="#3a4560"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#3a4560"
              secureTextEntry
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#00ff88', '#00cc6a']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#0a0f1e" />
              ) : (
                <Text style={styles.buttonText}>SIGN IN →</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text style={styles.signupLink}>Create one</Text>
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  header: {
    marginTop: 40,
  },
  badge: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff8840',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#00ff88',
    fontSize: 10,
    letterSpacing: 3,
  },
  title: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 48,
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#4a5578',
    letterSpacing: 0.3,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#4a5578',
    letterSpacing: 2,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e2d45',
    borderRadius: 10,
    padding: 16,
    color: '#ffffff',
    fontSize: 15,
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonGradient: {
    padding: 17,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Inter_700Bold',
    color: '#0a0f1e',
    fontSize: 14,
    letterSpacing: 2,
  },
  signupText: {
    fontFamily: 'Inter_400Regular',
    color: '#4a5578',
    textAlign: 'center',
    fontSize: 14,
  },
  signupLink: {
    fontFamily: 'Inter_600SemiBold',
    color: '#00ff88',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e2d45',
  },
  dotActive: {
    backgroundColor: '#00ff88',
    width: 20,
  },
})