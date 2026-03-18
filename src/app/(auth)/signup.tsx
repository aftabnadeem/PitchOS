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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SignupScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setLoading(false)
      Alert.alert('Signup Failed', error.message)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email,
        })

      if (profileError) {
        setLoading(false)
        Alert.alert('Error', profileError.message)
        return
      }
    }

    setLoading(false)
    Alert.alert(
      'Account Created! 🎉',
      'Welcome to PitchOS. Let\'s start closing deals.',
      [{ text: 'Let\'s Go', onPress: () => router.replace('/(tabs)') }]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0a0f1e', '#0d1b2a', '#0a0f1e']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NEW ACCOUNT</Text>
            </View>
            <Text style={styles.title}>Join{'\n'}PitchOS</Text>
            <Text style={styles.subtitle}>Start closing deals from day one</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Smith"
                placeholderTextColor="#3a4560"
                autoCapitalize="words"
              />
            </View>

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
                placeholder="Min. 6 characters"
                placeholderTextColor="#3a4560"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#3a4560"
                secureTextEntry
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSignup}
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
                  <Text style={styles.buttonText}>CREATE ACCOUNT →</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {['Free Forever', 'Team Sync', 'AI Powered'].map((stat) => (
                <View key={stat} style={styles.statItem}>
                  <Text style={styles.statDot}>✦</Text>
                  <Text style={styles.statText}>{stat}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
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
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 32,
  },
  header: {
    marginTop: 10,
  },
  backBtn: {
    marginBottom: 24,
  },
  backText: {
    fontFamily: 'Inter_400Regular',
    color: '#4a5578',
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff8840',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    fontFamily: 'Inter_700Bold',
    color: '#00ff88',
    fontSize: 10,
    letterSpacing: 3,
  },
  title: {
    fontFamily: 'Syne_800ExtraBold',
    fontSize: 42,
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 10,
    lineHeight: 46,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e2d45',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    fontFamily: 'Inter_400Regular',
    color: '#00ff88',
    fontSize: 8,
  },
  statText: {
    fontFamily: 'Inter_400Regular',
    color: '#4a5578',
    fontSize: 12,
  },
})