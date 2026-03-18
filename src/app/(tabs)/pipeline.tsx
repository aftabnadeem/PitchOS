import { supabase } from '@/lib/supabase'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const COLUMNS = [
  { key: 'lead', label: 'Lead', color: '#3b82f6' },
  { key: 'contacted', label: 'Contacted', color: '#f59e0b' },
  { key: 'replied', label: 'Replied', color: '#a855f7' },
  { key: 'negotiating', label: 'Negotiating', color: '#f97316' },
  { key: 'closed', label: 'Closed', color: '#00ff88' },
]

const CHANNELS = ['email', 'whatsapp', 'sms', 'call']

type Lead = {
  id: string
  name: string
  company: string
  email: string
  phone: string
  channel: string
  deal_value: number
  status: string
  notes: string
}

export default function Pipeline() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [channel, setChannel] = useState('email')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setLeads(data || [])
    }
    setLoading(false)
  }


  const logActivity = async (
    action: string,
    lead: Partial<Lead>,
    fromStatus?: string,
    toStatus?: string
    ) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, team_id')
        .eq('id', user.id)
        .single()

    if (!profile?.team_id) return

    await supabase.from('activities').insert({
        user_id: user.id,
        team_id: profile.team_id,
        user_name: profile.full_name,
        action,
        lead_name: lead.name,
        lead_company: lead.company,
        from_status: fromStatus,
        to_status: toStatus,
        deal_value: lead.deal_value || 0,
    })
}

  const handleAddLead = async () => {
    if (!name) {
      Alert.alert('Error', 'Name is required')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('leads').insert({
      user_id: user?.id,
      name,
      company,
      email,
      phone,
      channel,
      deal_value: parseFloat(dealValue) || 0,
      notes,
      status: 'lead',
    })

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      resetForm()
      setModalVisible(false)
      await logActivity('added', { name, company, deal_value: parseFloat(dealValue) || 0 })
      fetchLeads()
    }
    setSaving(false)
  }

  const handleMoveStatus = async (lead: Lead, newStatus: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', lead.id)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      const finalStatus = newStatus === 'closed' ? 'closed' : 'moved'
      await logActivity(finalStatus, lead, lead.status, newStatus)
      fetchLeads()
    }
  }

  const handleDeleteLead = (lead: Lead) => {
    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete ${lead.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('leads').delete().eq('id', lead.id)
            fetchLeads()
          },
        },
      ]
    )
  }

  const resetForm = () => {
    setName('')
    setCompany('')
    setEmail('')
    setPhone('')
    setDealValue('')
    setChannel('email')
    setNotes('')
  }

  const getLeadsByStatus = (status: string) =>
    leads.filter((l) => l.status === status)

  const getNextStatus = (current: string) => {
    const idx = COLUMNS.findIndex((c) => c.key === current)
    return idx < COLUMNS.length - 1 ? COLUMNS[idx + 1].key : null
  }

  const totalPipelineValue = leads.reduce((sum, l) => sum + (l.deal_value || 0), 0)

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pipeline</Text>
          <Text style={styles.headerSub}>
            {leads.length} leads · ₹{totalPipelineValue.toLocaleString()} total
          </Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={['#00ff88', '#00cc6a']}
            style={styles.addBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Feather name="plus" size={20} color="#0a0f1e" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Kanban Board */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00ff88" size="large" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.board}
        >
          {COLUMNS.map((col) => {
            const colLeads = getLeadsByStatus(col.key)
            return (
              <View key={col.key} style={styles.column}>

                {/* Column Header */}
                <View style={styles.colHeader}>
                  <View style={[styles.colDot, { backgroundColor: col.color }]} />
                  <Text style={styles.colLabel}>{col.label}</Text>
                  <View style={[styles.colCount, { backgroundColor: col.color + '20' }]}>
                    <Text style={[styles.colCountText, { color: col.color }]}>
                      {colLeads.length}
                    </Text>
                  </View>
                </View>

                {/* Cards */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  {colLeads.length === 0 ? (
                    <View style={styles.emptyCol}>
                      <Text style={styles.emptyColText}>No leads</Text>
                    </View>
                  ) : (
                    colLeads.map((lead) => {
                      const nextStatus = getNextStatus(lead.status)
                      return (
                        <View key={lead.id} style={styles.card}>
                          {/* Card Top */}
                          <View style={styles.cardTop}>
                            <View style={styles.cardAvatar}>
                              <Text style={styles.cardAvatarText}>
                                {lead.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.cardInfo}>
                              <Text style={styles.cardName} numberOfLines={1}>
                                {lead.name}
                              </Text>
                              {lead.company ? (
                                <Text style={styles.cardCompany} numberOfLines={1}>
                                  {lead.company}
                                </Text>
                              ) : null}
                            </View>
                            <Pressable
                              onPress={() => handleDeleteLead(lead)}
                              style={styles.cardDelete}
                            >
                              <Feather name="trash-2" size={13} color="#4a5578" />
                            </Pressable>
                          </View>

                          {/* Deal Value */}
                          {lead.deal_value > 0 && (
                            <View style={styles.dealRow}>
                              <Feather name="dollar-sign" size={11} color="#00ff88" />
                              <Text style={styles.dealValue}>
                                ₹{lead.deal_value.toLocaleString()}
                              </Text>
                            </View>
                          )}

                          {/* Channel */}
                          <View style={styles.channelRow}>
                            <Feather
                              name={
                                lead.channel === 'email' ? 'mail' :
                                lead.channel === 'whatsapp' ? 'message-circle' :
                                lead.channel === 'call' ? 'phone' : 'message-square'
                              }
                              size={11}
                              color="#4a5578"
                            />
                            <Text style={styles.channelText}>{lead.channel}</Text>
                          </View>

                          {/* Move Forward Button */}
                          {nextStatus && (
                            <Pressable
                              style={styles.moveBtn}
                              onPress={() => handleMoveStatus(lead, nextStatus)}
                            >
                              <Text style={[styles.moveBtnText, { color: col.color }]}>
                                Move to {COLUMNS.find(c => c.key === nextStatus)?.label} →
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )
                    })
                  )}
                </ScrollView>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Add Lead Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Lead</Text>
            <Pressable
              onPress={() => { setModalVisible(false); resetForm() }}
              style={styles.modalClose}
            >
              <Feather name="x" size={20} color="#4a5578" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalForm}>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Smith"
                  placeholderTextColor="#3a4560"
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

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="john@acme.com"
                  placeholderTextColor="#3a4560"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PHONE</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#3a4560"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Deal Value */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DEAL VALUE (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={dealValue}
                  onChangeText={setDealValue}
                  placeholder="50000"
                  placeholderTextColor="#3a4560"
                  keyboardType="numeric"
                />
              </View>

              {/* Channel */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>OUTREACH CHANNEL</Text>
                <View style={styles.channelPicker}>
                  {CHANNELS.map((ch) => (
                    <Pressable
                      key={ch}
                      style={[
                        styles.channelOption,
                        channel === ch && styles.channelOptionActive,
                      ]}
                      onPress={() => setChannel(ch)}
                    >
                      <Text style={[
                        styles.channelOptionText,
                        channel === ch && styles.channelOptionTextActive,
                      ]}>
                        {ch}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOTES</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional context..."
                  placeholderTextColor="#3a4560"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Submit */}
              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                onPress={handleAddLead}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#00ff88', '#00cc6a']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {saving ? (
                    <ActivityIndicator color="#0a0f1e" />
                  ) : (
                    <Text style={styles.submitText}>ADD TO PIPELINE →</Text>
                  )}
                </LinearGradient>
              </Pressable>

            </View>
          </ScrollView>
        </View>
      </Modal>

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
    paddingBottom: 16,
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
  addBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnGradient: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  board: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  column: {
    width: 220,
    maxHeight: '100%',
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  colDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#ffffff',
    flex: 1,
    letterSpacing: 0.5,
  },
  colCount: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  colCountText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  emptyCol: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2d45',
    borderStyle: 'dashed',
  },
  emptyColText: {
    fontFamily: 'Inter_400Regular',
    color: '#2a3550',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e2d45',
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#00ff8820',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 15,
    color: '#00ff88',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  cardCompany: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#4a5578',
    marginTop: 1,
  },
  cardDelete: {
    padding: 4,
  },
  dealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#00ff88',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#4a5578',
    textTransform: 'capitalize',
  },
  moveBtn: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e2d45',
  },
  moveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  modal: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e2d45',
  },
  modalTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    color: '#ffffff',
  },
  modalClose: {
    padding: 6,
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  modalForm: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
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
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  channelPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  channelOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e2d45',
    alignItems: 'center',
  },
  channelOptionActive: {
    backgroundColor: '#00ff8820',
    borderColor: '#00ff88',
  },
  channelOptionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#4a5578',
    textTransform: 'capitalize',
  },
  channelOptionTextActive: {
    color: '#00ff88',
  },
  submitBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitGradient: {
    padding: 17,
    alignItems: 'center',
  },
  submitText: {
    fontFamily: 'Inter_700Bold',
    color: '#0a0f1e',
    fontSize: 14,
    letterSpacing: 2,
  },
})