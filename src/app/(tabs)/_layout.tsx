import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopWidth: 1,
          borderTopColor: '#1e2d45',
          height: 80,
        },
        tabBarActiveTintColor: '#00ff88',
        tabBarInactiveTintColor: '#4a5578',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          tabBarLabel: 'Pipeline',
          tabBarIcon: ({ color }) => <Feather name="trello" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          tabBarLabel: 'Compose',
          tabBarIcon: ({ color }) => <Feather name="edit-3" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <Feather name="map-pin" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          tabBarLabel: 'Team',
          tabBarIcon: ({ color }) => <Feather name="users" size={20} color={color} />,
        }}
      />
    </Tabs>
  )
}