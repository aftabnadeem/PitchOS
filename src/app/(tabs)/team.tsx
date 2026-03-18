import { supabase } from '@/lib/supabase'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
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

type Activity = {
  id: string
  user_name: string
  action: string
  lead_name: string
  lead_company: string
  from_status: string
  to_status: string
  deal_value: number
  created_at: string
}

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
}

type Team = {
  id: string
  name: string
  invite_code: string
}

export default function TeamFeed() {
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    loadTeamData()
  }, [])

  useEffect(() => {
    if (!team) return

    // Subscribe to real-time activities
    const channel = supabase
      .channel(`team-feed-${team.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `team_id=eq.${team.id}`,
        },
        (payload) => {
          setActivities((prev) => [payload.new as Activity, ...prev])
          setLiveCount((c) => c + 1)
          setTimeout(() => setLiveCount((c) => Math.max(0, c - 1)), 3000)
          scrollRef.current?.scrollTo({ y: 0, animated: true })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [team])

  const loadTeamData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get profile with team_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single()

    if (!profile?.team_id) {
      setLoading(false)
      return
    }

    // Get team details
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', profile.team_id)
      .single()

    if (teamData) {
      setTeam(teamData)
      await fetchActivities(teamData.id)
      await fetchMembers(teamData.id)
    }

    setLoading(false)
  }

  const fetchActivities = async (teamId: string) => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50)

    setActivities(data || [])
  }

  const fetchMembers = async (teamId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('team_id', teamId)

    setMembers(data || [])
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name: teamName, created_by: user?.id })
      .select()
      .single()

    if (error) {
      Alert.alert('Error', error.message)
      setSaving(false)
      return
    }

    // Update profile with team_id
    await supabase
      .from('profiles')
      .update({ team_id: newTeam.id })
      .eq('id', user?.id)

    setSaving(false)
    setModalVisible(false)
    setTeamName('')
    loadTeamData()
  }

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: foundTeam, error } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()

    if (error || !foundTeam) {
      Alert.alert('Error', 'Invalid invite code. Please check and try again.')
      setSaving(false)
      return
    }

    await supabase
      .from('profiles')
      .update({ team_id: foundTeam.id })
      .eq('id', user?.id)

    setSaving(false)
    setModalVisible(false)
    setInviteCode('')
    loadTeamData()
  }

  const getActivityIcon = (action: string) => {
    if (action === 'moved') return { icon: 'arrow-right', color: '#3b82f6' }
    if (action === 'closed') return { icon: 'award', color: '#00ff88' }
    if (action === 'added') return { icon: 'user-plus', color: '#a855f7' }
    return { icon: 'activity', color: '#4a5578' }
  }

  const getActivityText = (activity: Activity) => {
    if (activity.action === 'added') {
      return `added ${activity.lead_name}${activity.lead_company ? ` from ${activity.lead_company}` : ''} as a new lead`
    }
    if (activity.action === 'moved') {
      return `moved ${activity.lead_name} from ${activity.from_status} → ${activity.to_status}`
    }
    if (activity.action === 'closed') {
      return `closed ${activity.lead_name}${activity.deal_value > 0 ? ` for ₹${activity.deal_value.toLocaleString()}` : ''} 🎉`
    }
    return activity.action
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00ff88" size="large" />
        </View>
      </SafeAreaView>
    )
  }

  // No team yet
  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Team</Text>
          <Text style={styles.headerSub}>Collaborate in real-time</Text>
        </View>

        <View style={styles.noTeamContainer}>
          <View style={styles.noTeamIcon}>
            <Feather name="users" size={36} color="#1e2d45" />
          </View>
          <Text style={styles.noTeamTitle}>No Team Yet</Text>
          <Text style={styles.noTeamSub}>
            Create a team or join one with an invite code to see live activity
          </Text>

          <Pressable
            style={styles.createTeamBtn}
            onPress={() => { setModalMode('create'); setModalVisible(true) }}
          >
            <LinearGradient
              colors={['#00ff88', '#00cc6a']}
              style={styles.createTeamGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="plus" size={16} color="#0a0f1e" />
              <Text style={styles.createTeamText}>CREATE TEAM</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.joinTeamBtn}
            onPress={() => { setModalMode('join'); setModalVisible(true) }}
          >
            <Feather name="log-in" size={16} color="#4a5578" />
            <Text style={styles.joinTeamText}>Join with Invite Code</Text>
          </Pressable>
        </View>

        {/* Create / Join Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'create' ? 'Create Team' : 'Join Team'}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Feather name="x" size={20} color="#4a5578" />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {modalMode === 'create' ? (
                <>
                  <Text style={styles.inputLabel}>TEAM NAME</Text>
                  <TextInput
                    style={styles.input}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="e.g. Sales Wolves"
                    placeholderTextColor="#3a4560"
                    autoCapitalize="words"
                  />
                  <Text style={styles.modalHint}>
                    An invite code will be auto-generated for your team
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>INVITE CODE</Text>
                  <TextInput
                    style={styles.input}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    placeholder="Enter 8-character code"
                    placeholderTextColor="#3a4560"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.modalHint}>
                    Ask your team admin for the invite code
                  </Text>
                </>
              )}

              <Pressable
                style={({ pressed }) => [styles.modalBtn, pressed && { opacity: 0.85 }]}
                onPress={modalMode === 'create' ? handleCreateTeam : handleJoinTeam}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#00ff88', '#00cc6a']}
                  style={styles.modalBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {saving ? (
                    <ActivityIndicator color="#0a0f1e" />
                  ) : (
                    <Text style={styles.modalBtnText}>
                      {modalMode === 'create' ? 'CREATE TEAM →' : 'JOIN TEAM →'}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{team.name}</Text>
          <Text style={styles.headerSub}>
            {members.length} member{members.length !== 1 ? 's' : ''} · Live feed
          </Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={[styles.liveDot, liveCount > 0 && styles.liveDotActive]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Invite Code Banner */}
      <View style={styles.inviteBanner}>
        <View>
          <Text style={styles.inviteLabel}>INVITE CODE</Text>
          <Text style={styles.inviteCode}>{team.invite_code}</Text>
        </View>
        <Pressable
          onPress={() => {
            const { Clipboard } = require('react-native')
            Clipboard.setString(team.invite_code)
            Alert.alert('Copied!', 'Invite code copied to clipboard')
          }}
          style={styles.inviteCopyBtn}
        >
          <Feather name="copy" size={16} color="#00ff88" />
          <Text style={styles.inviteCopyText}>Copy</Text>
        </Pressable>
      </View>

      {/* Members Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.membersScroll}
        contentContainerStyle={styles.membersContent}
      >
        {members.map((member) => (
          <View key={member.id} style={styles.memberChip}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.full_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <Text style={styles.memberName} numberOfLines={1}>
              {member.full_name?.split(' ')[0] || 'Member'}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Activity Feed */}
      <Text style={styles.sectionTitle}>ACTIVITY FEED</Text>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {activities.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Feather name="activity" size={32} color="#1e2d45" />
            <Text style={styles.emptyFeedText}>No activity yet</Text>
            <Text style={styles.emptyFeedSub}>
              Team activity will appear here in real-time
            </Text>
          </View>
        ) : (
          activities.map((activity, index) => {
            const { icon, color } = getActivityIcon(activity.action)
            return (
              <View
                key={activity.id}
                style={[styles.activityItem, index === 0 && styles.activityItemNew]}
              >
                <View style={[styles.activityIcon, { backgroundColor: color + '20' }]}>
                  <Feather name={icon as any} size={15} color={color} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    <Text style={styles.activityUser}>{activity.user_name} </Text>
                    {getActivityText(activity)}
                  </Text>
                  <Text style={styles.activityTime}>{timeAgo(activity.created_at)}</Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e2d45',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1e2d45',
  },
  liveDotActive: {
    backgroundColor: '#00ff88',
  },
  liveText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#4a5578',
    letterSpacing: 1,
  },
  inviteBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e2d45',
    marginBottom: 16,
  },
  inviteLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#4a5578',
    letterSpacing: 2,
    marginBottom: 4,
  },
  inviteCode: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#00ff88',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  inviteCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00ff8815',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  inviteCopyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#00ff88',
  },
  membersScroll: {
    marginBottom: 20,
  },
  membersContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  memberChip: {
    alignItems: 'center',
    gap: 6,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#00ff8820',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ff8840',
  },
  memberAvatarText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 16,
    color: '#00ff88',
  },
  memberName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#4a5578',
    maxWidth: 50,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#4a5578',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  feedContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 10,
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  emptyFeedText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#4a5578',
    fontSize: 16,
  },
  emptyFeedSub: {
    fontFamily: 'Inter_400Regular',
    color: '#2a3550',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  activityItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  activityItemNew: {
    borderColor: '#00ff8840',
    backgroundColor: '#0d1f14',
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  activityUser: {
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
  },
  activityTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#4a5578',
  },
  noTeamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 14,
  },
  noTeamIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e2d45',
    marginBottom: 6,
  },
  noTeamTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 22,
    color: '#ffffff',
  },
  noTeamSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#4a5578',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  createTeamBtn: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  createTeamGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  createTeamText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#0a0f1e',
    letterSpacing: 2,
  },
  joinTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  joinTeamText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#4a5578',
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
  modalBody: {
    padding: 20,
    gap: 12,
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
  modalHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#4a5578',
    lineHeight: 18,
  },
  modalBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  modalBtnGradient: {
    padding: 17,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#0a0f1e',
    fontSize: 14,
    letterSpacing: 2,
  },
})