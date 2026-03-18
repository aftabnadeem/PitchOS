import { supabase } from '@/lib/supabase'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const STATS = [
  { label: 'Leads Added', value: '0', icon: 'user-plus', color: '#00ff88' },
  { label: 'Messages Sent', value: '0', icon: 'send', color: '#3b82f6' },
  { label: 'Deals Closed', value: '0', icon: 'award', color: '#f59e0b' },
]

const QUICK_ACTIONS = [
  { label: 'Add Lead', icon: 'user-plus', screen: '/(tabs)/pipeline', color: '#00ff88' },
  { label: 'Compose', icon: 'edit-3', screen: '/(tabs)/compose', color: '#3b82f6' },
  { label: 'Find Prospects', icon: 'map-pin', screen: '/(tabs)/map', color: '#f59e0b' },
  { label: 'Team Feed', icon: 'users', screen: '/(tabs)/team', color: '#a855f7' },
]

export default function Dashboard() {
  const [userName, setUserName] = useState('there')
  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.full_name) {
              setUserName(data.full_name.split(' ')[0])
            }
          })
      }
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{userName} 👋</Text>
          </View>
          <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
            <Feather name="log-out" size={18} color="#4a5578" />
          </Pressable>
        </View>

        {/* Banner */}
        <LinearGradient
          colors={['#003d22', '#001a10']}
          style={styles.banner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerLabel}>TODAY'S TARGET</Text>
            <Text style={styles.bannerValue}>₹0 / ₹50,000</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '0%' }]} />
            </View>
            <Text style={styles.bannerSub}>0% of daily goal reached</Text>
          </View>
          <View style={styles.bannerIcon}>
            <Feather name="target" size={40} color="#00ff8830" />
          </View>
        </LinearGradient>

        {/* Stats */}
        <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>
        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Feather name={stat.icon as any} size={18} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
              onPress={() => router.push(action.screen as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Feather name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Feather name="chevron-right" size={14} color="#4a5578" />
            </Pressable>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        <View style={styles.emptyActivity}>
          <Feather name="activity" size={32} color="#1e2d45" />
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubText}>Start adding leads to see your activity here</Text>
        </View>

      </ScrollView>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#4a5578',
    letterSpacing: 0.5,
  },
  userName: {
    fontFamily: 'Syne_700Bold',
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  signOutBtn: {
    padding: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  banner: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ff8820',
    marginBottom: 28,
  },
  bannerLeft: {
    flex: 1,
  },
  bannerLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#00ff88',
    letterSpacing: 2,
    marginBottom: 6,
  },
  bannerValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#003d22',
    borderRadius: 2,
    marginBottom: 6,
    width: '90%',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#00ff88',
    borderRadius: 2,
  },
  bannerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#4a5578',
  },
  bannerIcon: {
    marginLeft: 10,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#4a5578',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#ffffff',
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: '#4a5578',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  actionsGrid: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  actionCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
    marginHorizontal: 20,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2d45',
    marginBottom: 30,
  },
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#4a5578',
    fontSize: 16,
  },
  emptySubText: {
    fontFamily: 'Inter_400Regular',
    color: '#2a3550',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
})