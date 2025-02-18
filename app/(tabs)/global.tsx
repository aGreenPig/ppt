import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
    apiKey: "AIzaSyA_Duynbh7juMmScLejlRKhndV59BG51S4",
    authDomain: "pptppt-f2257.firebaseapp.com",
    projectId: "pptppt-f2257",
    storageBucket: "pptppt-f2257.firebasestorage.app",
    messagingSenderId: "295151000635",
    appId: "1:295151000635:web:93f665f8569ac53383101e",
    measurementId: "G-WD4Z6KY627"
  };

export const iosClientId = __DEV__
  ? '295151000635-9novlf078ugu1f7g8ui1qaru9etacrjr.apps.googleusercontent.com'
  : 'YOUR_PRODUCTION_IOS_CLIENT_ID'; // Bundle ID: com.yourcompany.yourapp
export const webClientId = '295151000635-9fvj1qebvar82sgp04tn3uksvsttevs3.apps.googleusercontent.com'
export const androidClientId = 'TBD'

// http://127.0.0.1:5000
export const backendDomain = __DEV__ ? 'https://gb9i2r5dmg.execute-api.us-east-1.amazonaws.com/dev' : 'https://gb9i2r5dmg.execute-api.us-east-1.amazonaws.com/dev'