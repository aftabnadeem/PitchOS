 
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = 'https://fbwlozjnaevttyajbkbb.supabase.co'
const supabaseAnonKey = 'sb_publishable_evnWd8cl_bHlFrnkkULfWg_GTwpOW3o'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})