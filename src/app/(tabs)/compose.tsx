import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Clipboard,
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

const CHANNELS = [
  { key: 'email', label: 'Email', icon: 'mail' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'message-circle' },
  { key: 'call', label: 'Call Script', icon: 'phone' },
]

const TONES = [
  { key: 'professional', label: 'Professional' },
  { key: 'friendly', label: 'Friendly' },
  { key: 'aggressive', label: 'Aggressive' },
  { key: 'casual', label: 'Casual' },
]

const GEMINI_API_KEY = 'AIzaSyBLTOwjv2vCji2C6Q0_FZxEpnl2lHBvtHo'

export default function Compose() {
  const [prospectName, setProspectName] = useState('')
  const [company, setCompany] = useState('')
  const [product, setProduct] = useState('')
  const [channel, setChannel] = useState('email')
  const [tone, setTone] = useState('professional')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const buildPrompt = () => {
    const channelLabel = CHANNELS.find(c => c.key === channel)?.label
    return `You are an expert sales copywriter. Write a ${tone} ${channelLabel} outreach message with these details:
- Prospect Name: ${prospectName || 'the prospect'}
- Company: ${company || 'their company'}
- Product/Service being sold: ${product || 'our product'}
- Tone: ${tone}
- Channel: ${channelLabel}

Rules:
- For email: include a subject line, greeting, 2-3 short paragraphs, and a clear CTA
- For whatsapp: keep it short, conversational, max 4-5 lines, include a question at the end
- For call script: write a structured script with opener, value proposition, and discovery questions
- Do NOT use placeholder brackets like [Name] — use the actual values provided
- Make it feel human, not robotic
- Be concise and punchy

Write only the message, nothing else.`
  }

  const handleGenerate = async () => {
    if (!prospectName) {
      Alert.alert('Error', 'Please enter the prospect name')
      return
    }
    if (!product) {
      Alert.alert('Error', 'Please enter what you are selling')
      return
    }

    setLoading(true)
    setGeneratedMessage('')

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt() }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 1024,
            },
          }),
        }
      )

      const data = await response.json()

      if (data.error) {
        Alert.alert('API Error', data.error.message)
        return
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        setGeneratedMessage(text)
      } else {
        Alert.alert('Error', 'No response generated, please try again')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to Gemini API')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    Clipboard.setString(generatedMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClear = () => {
    setGeneratedMessage('')
    setProspectName('')
    setCompany('')
    setProduct('')
    setChannel('email')
    setTone('professional')
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>AI Compose</Text>
              <Text style={styles.headerSub}>Generate personalized outreach</Text>
            </View>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>✦ Gemini</Text>
            </View>
          </View>

          <View style={styles.form}>

            {/* Prospect Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PROSPECT NAME *</Text>
              <TextInput
                style={styles.input}
                value={prospectName}
                onChangeText={setProspectName}
                placeholder="John Smith"
                placeholderTextColor="#3a4560"
                autoCapitalize="words"
              />
            </View>

            {/* Company */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>COMPANY</Text>
              <TextInput
                style={styles.input}
                value={company}
                onChangeText={setCompany}
                placeholder="Acme Corp"
                placeholderTextColor="#3a4560"
              />
            </View>

            {/* Product */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WHAT ARE YOU SELLING? *</Text>
              <TextInput
                style={styles.input}
                value={product}
                onChangeText={setProduct}
                placeholder="e.g. CRM software, Marketing services..."
                placeholderTextColor="#3a4560"
              />
            </View>

            {/* Channel */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CHANNEL</Text>
              <View style={styles.optionRow}>
                {CHANNELS.map((ch) => (
                  <Pressable
                    key={ch.key}
                    style={[styles.optionBtn, channel === ch.key && styles.optionBtnActive]}
                    onPress={() => setChannel(ch.key)}
                  >
                    <Feather
                      name={ch.icon as any}
                      size={14}
                      color={channel === ch.key ? '#00ff88' : '#4a5578'}
                    />
                    <Text style={[
                      styles.optionText,
                      channel === ch.key && styles.optionTextActive
                    ]}>
                      {ch.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Tone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TONE</Text>
              <View style={styles.optionRow}>
                {TONES.map((t) => (
                  <Pressable
                    key={t.key}
                    style={[styles.optionBtn, tone === t.key && styles.optionBtnActive]}
                    onPress={() => setTone(t.key)}
                  >
                    <Text style={[
                      styles.optionText,
                      tone === t.key && styles.optionTextActive
                    ]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Generate Button */}
            <Pressable
              style={({ pressed }) => [styles.generateBtn, pressed && { opacity: 0.85 }]}
              onPress={handleGenerate}
              disabled={loading}
            >
              <LinearGradient
                colors={['#00ff88', '#00cc6a']}
                style={styles.generateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#0a0f1e" size="small" />
                    <Text style={styles.generateText}>Generating...</Text>
                  </View>
                ) : (
                  <Text style={styles.generateText}>✦ GENERATE MESSAGE</Text>
                )}
              </LinearGradient>
            </Pressable>

          </View>

          {/* Generated Output */}
          {generatedMessage !== '' && (
            <View style={styles.outputContainer}>

              <View style={styles.outputHeader}>
                <Text style={styles.outputTitle}>Generated Message</Text>
                <View style={styles.outputActions}>
                  <Pressable
                    style={styles.outputBtn}
                    onPress={handleCopy}
                  >
                    <Feather
                      name={copied ? 'check' : 'copy'}
                      size={15}
                      color={copied ? '#00ff88' : '#4a5578'}
                    />
                    <Text style={[styles.outputBtnText, copied && { color: '#00ff88' }]}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.outputBtn} onPress={handleClear}>
                    <Feather name="refresh-cw" size={15} color="#4a5578" />
                    <Text style={styles.outputBtnText}>Clear</Text>
                  </Pressable>
                </View>
              </View>

              <TextInput
                style={styles.outputText}
                value={generatedMessage}
                onChangeText={setGeneratedMessage}
                multiline
                scrollEnabled={false}
                selectionColor="#00ff88"
              />

            </View>
          )}

          <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#4a5578',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff8840',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#00ff88',
    letterSpacing: 1,
  },
  form: {
    paddingHorizontal: 20,
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
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
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  optionBtnActive: {
    backgroundColor: '#00ff8815',
    borderColor: '#00ff88',
  },
  optionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#4a5578',
  },
  optionTextActive: {
    color: '#00ff88',
  },
  generateBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
  },
  generateGradient: {
    padding: 17,
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateText: {
    fontFamily: 'Inter_700Bold',
    color: '#0a0f1e',
    fontSize: 14,
    letterSpacing: 2,
  },
  outputContainer: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2d45',
    overflow: 'hidden',
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2d45',
    backgroundColor: '#0d1520',
  },
  outputTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  outputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  outputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  outputBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#4a5578',
  },
  outputText: {
    fontFamily: 'Inter_400Regular',
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    padding: 16,
  },
})