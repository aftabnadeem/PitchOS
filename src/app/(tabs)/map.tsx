import { supabase } from '@/lib/supabase'
import { Feather } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY

const PLACE_TYPES = [
  { key: 'restaurant', label: 'Restaurants', icon: 'coffee' },
  { key: 'store', label: 'Stores', icon: 'shopping-bag' },
  { key: 'office', label: 'Offices', icon: 'briefcase' },
  { key: 'gym', label: 'Gyms', icon: 'activity' },
  { key: 'hospital', label: 'Hospitals', icon: 'heart' },
]

type Place = {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  geometry: {
    location: { lat: number; lng: number }
  }
  types: string[]
}

type Region = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export default function MapScreen() {
  const [location, setLocation] = useState<Region | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [activeType, setActiveType] = useState('restaurant')
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [outreachModal, setOutreachModal] = useState(false)
  const [generatingMessage, setGeneratingMessage] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [product, setProduct] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [outreachPlace, setOutreachPlace] = useState<Place | null>(null)
  const mapRef = useRef<MapView>(null)

  useEffect(() => {
    getLocation()
  }, [])

  const getLocation = async () => {
    setLoadingLocation(true)
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to find nearby prospects.'
      )
      setLoadingLocation(false)
      return
    }

    const loc = await Location.getCurrentPositionAsync({})
    const region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
    setLocation(region)
    setLoadingLocation(false)
    fetchNearbyPlaces(loc.coords.latitude, loc.coords.longitude, activeType)
  }

  const fetchNearbyPlaces = async (lat: number, lng: number, type: string) => {
    setLoadingPlaces(true)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=${type}&key=${GOOGLE_API_KEY}`
      )
      const data = await response.json()
      if (data.results) {
        setPlaces(data.results.slice(0, 20))
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch nearby places')
    } finally {
      setLoadingPlaces(false)
    }
  }

  const handleTypeChange = (type: string) => {
    setActiveType(type)
    setSelectedPlace(null)
    if (location) {
      fetchNearbyPlaces(location.latitude, location.longitude, type)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !location) return
    setSearching(true)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${location.latitude},${location.longitude}&radius=2000&key=${GOOGLE_API_KEY}`
      )
      const data = await response.json()
      if (data.results) {
        setPlaces(data.results.slice(0, 20))
        if (data.results.length > 0) {
          const first = data.results[0]
          mapRef.current?.animateToRegion({
            latitude: first.geometry.location.lat,
            longitude: first.geometry.location.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          })
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleMarkerPress = (place: Place) => {
    setSelectedPlace(place)
    mapRef.current?.animateToRegion({
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    })
  }

  const handleAddAsLead = async (place: Place) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('leads').insert({
      user_id: user.id,
      name: place.name,
      company: place.name,
      notes: `Address: ${place.vicinity}`,
      status: 'lead',
      channel: 'email',
    })

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('✅ Lead Added', `${place.name} has been added to your pipeline!`)
      setSelectedPlace(null)
    }
  }

  const handleGenerateOutreach = async () => {
  if (!product.trim()) {
    Alert.alert('Error', 'Please enter what you are selling')
    return
  }

  if (!outreachPlace) {
    Alert.alert('Error', 'No place selected')
    return
  }

  setGeneratingMessage(true)
  setGeneratedMessage('')

  const prompt = `Write a short, friendly cold email outreach message to ${outreachPlace.name}, a local business located at ${outreachPlace.vicinity}. I am selling: ${product}. Keep it under 5 sentences, professional but warm, with a clear call to action. Write only the message, nothing else.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
        }),
      }
    )

    const data = await response.json()
    console.log('Gemini response:', JSON.stringify(data))

    if (data.error) {
      Alert.alert('API Error', data.error.message)
      return
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) {
      setGeneratedMessage(text)
    } else {
      Alert.alert('Error', 'No text in response: ' + JSON.stringify(data))
    }
  } catch (err) {
    console.log('Fetch error:', err)
    Alert.alert('Error', 'Failed to connect: ' + String(err))
  } finally {
    setGeneratingMessage(false)
  }
}

  if (loadingLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00ff88" size="large" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Prospect Map</Text>
          <Text style={styles.headerSub}>
            {loadingPlaces ? 'Finding businesses...' : `${places.length} prospects nearby`}
          </Text>
        </View>
        <Pressable style={styles.locationBtn} onPress={getLocation}>
          <Feather name="navigation" size={18} color="#00ff88" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Feather name="search" size={16} color="#4a5578" />
          <TextInput
            style={styles.searchText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search businesses..."
            placeholderTextColor="#3a4560"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color="#00ff88" />}
        </View>
        <Pressable style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Go</Text>
        </Pressable>
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {PLACE_TYPES.map((type) => (
          <Pressable
            key={type.key}
            style={[styles.filterChip, activeType === type.key && styles.filterChipActive]}
            onPress={() => handleTypeChange(type.key)}
          >
            <Feather
              name={type.icon as any}
              size={13}
              color={activeType === type.key ? '#00ff88' : '#4a5578'}
            />
            <Text style={[
              styles.filterChipText,
              activeType === type.key && styles.filterChipTextActive
            ]}>
              {type.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Map */}
      {location && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={location}
            customMapStyle={darkMapStyle}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {places.map((place) => (
              <Marker
                key={place.place_id}
                coordinate={{
                  latitude: place.geometry.location.lat,
                  longitude: place.geometry.location.lng,
                }}
                onPress={() => handleMarkerPress(place)}
              >
                <View style={[
                  styles.marker,
                  selectedPlace?.place_id === place.place_id && styles.markerSelected
                ]}>
                  <Feather name="map-pin" size={14} color={
                    selectedPlace?.place_id === place.place_id ? '#0a0f1e' : '#00ff88'
                  } />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Selected Place Card */}
          {selectedPlace && (
            <View style={styles.placeCard}>
              <View style={styles.placeCardTop}>
                <View style={styles.placeCardInfo}>
                  <Text style={styles.placeName} numberOfLines={1}>
                    {selectedPlace.name}
                  </Text>
                  <Text style={styles.placeAddress} numberOfLines={1}>
                    {selectedPlace.vicinity}
                  </Text>
                  {selectedPlace.rating && (
                    <Text style={styles.placeRating}>⭐ {selectedPlace.rating}</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setSelectedPlace(null)}
                  style={styles.placeCardClose}
                >
                  <Feather name="x" size={16} color="#4a5578" />
                </Pressable>
              </View>

              <View style={styles.placeCardActions}>
                <Pressable
                  style={styles.placeActionBtn}
                  onPress={() => handleAddAsLead(selectedPlace)}
                >
                  <Feather name="user-plus" size={14} color="#3b82f6" />
                  <Text style={[styles.placeActionText, { color: '#3b82f6' }]}>
                    Add as Lead
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.placeActionBtn}
                  onPress={() => {
                    setOutreachPlace(selectedPlace)  // ← save it here
                    setOutreachModal(true)
                    setGeneratedMessage('')
                    setProduct('')
                    }}
                >
                  <Feather name="edit-3" size={14} color="#00ff88" />
                  <Text style={[styles.placeActionText, { color: '#00ff88' }]}>
                    Generate Outreach
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.placeActionBtn}
                  onPress={() => Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${selectedPlace.geometry.location.lat},${selectedPlace.geometry.location.lng}`
                  )}
                >
                  <Feather name="external-link" size={14} color="#f59e0b" />
                  <Text style={[styles.placeActionText, { color: '#f59e0b' }]}>
                    Open Maps
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Outreach Modal */}
      <Modal
        visible={outreachModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOutreachModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Generate Outreach</Text>
              <Text style={styles.modalSub}>{outreachPlace?.name}</Text>
            </View>
            <Pressable
              onPress={() => setOutreachModal(false)}
              style={styles.modalClose}
            >
              <Feather name="x" size={20} color="#4a5578" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WHAT ARE YOU SELLING?</Text>
              <TextInput
                style={styles.input}
                value={product}
                onChangeText={setProduct}
                placeholder="e.g. POS software, delivery service..."
                placeholderTextColor="#3a4560"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.generateBtn, pressed && { opacity: 0.85 }]}
              onPress={handleGenerateOutreach}
              disabled={generatingMessage}
            >
              <LinearGradient
                colors={['#00ff88', '#00cc6a']}
                style={styles.generateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {generatingMessage ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#0a0f1e" size="small" />
                    <Text style={styles.generateText}>Generating...</Text>
                  </View>
                ) : (
                  <Text style={styles.generateText}>✦ GENERATE MESSAGE</Text>
                )}
              </LinearGradient>
            </Pressable>

            {generatedMessage !== '' && (
              <View style={styles.outputBox}>
                <TextInput
                  style={styles.outputText}
                  value={generatedMessage}
                  onChangeText={setGeneratedMessage}
                  multiline
                  scrollEnabled={false}
                  selectionColor="#00ff88"
                />
                <Pressable
                  style={styles.copyBtn}
                  onPress={() => {
                    const { Clipboard } = require('react-native')
                    Clipboard.setString(generatedMessage)
                    Alert.alert('Copied!', 'Message copied to clipboard')
                  }}
                >
                  <Feather name="copy" size={15} color="#00ff88" />
                  <Text style={styles.copyBtnText}>Copy Message</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

// Dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0a0f1e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a5578' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0f1e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e2d45' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e2d45' }] },
]

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    color: '#4a5578',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
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
  locationBtn: {
    padding: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2d45',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e2d45',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
  },
  searchText: {
    fontFamily: 'Inter_400Regular',
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff88',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#00ff88',
    fontSize: 14,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  paddingVertical: 5,
  paddingHorizontal: 10,
  borderRadius: 20,
  backgroundColor: '#111827',
  borderWidth: 1,
  borderColor: '#1e2d45',
  height: 32,
},
  filterChipActive: {
    backgroundColor: '#00ff8815',
    borderColor: '#00ff88',
  },
  filterChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#4a5578',
  },
  filterChipTextActive: {
    color: '#00ff88',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#00ff88',
    borderRadius: 20,
    padding: 6,
  },
  markerSelected: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  placeCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e2d45',
    gap: 12,
  },
  placeCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  placeCardInfo: {
    flex: 1,
    gap: 3,
  },
  placeName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  placeAddress: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#4a5578',
  },
  placeRating: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#f59e0b',
  },
  placeCardClose: {
    padding: 4,
  },
  placeCardActions: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  borderTopWidth: 1,
  borderTopColor: '#1e2d45',
  paddingTop: 12,
},
placeActionBtn: {
  width: '47%',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  paddingVertical: 9,
  paddingHorizontal: 6,
  borderRadius: 8,
  backgroundColor: '#0a0f1e',
  borderWidth: 1,
  borderColor: '#1e2d45',
},
placeActionText: {
  fontFamily: 'Inter_600SemiBold',
  fontSize: 11,
  flexShrink: 1,
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
  modalSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#4a5578',
    marginTop: 2,
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
  },
  inputGroup: {
    gap: 8,
    marginBottom: 16,
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
  generateBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  generateGradient: {
    padding: 16,
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
  outputBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2d45',
    overflow: 'hidden',
    marginBottom: 40,
  },
  outputText: {
    fontFamily: 'Inter_400Regular',
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    padding: 16,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e2d45',
  },
  copyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#00ff88',
  },
})