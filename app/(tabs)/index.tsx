import React, { useState, useEffect } from 'react';
import { Button, Image, StyleSheet, Platform, Alert, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { ResponseType } from 'expo-auth-session';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, onAuthStateChanged, User } from "firebase/auth";

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

WebBrowser.maybeCompleteAuthSession();

const firebaseConfig = {
  apiKey: "AIzaSyA_Duynbh7juMmScLejlRKhndV59BG51S4",
  authDomain: "pptppt-f2257.firebaseapp.com",
  projectId: "pptppt-f2257",
  storageBucket: "pptppt-f2257.firebasestorage.app",
  messagingSenderId: "295151000635",
  appId: "1:295151000635:web:93f665f8569ac53383101e",
  measurementId: "G-WD4Z6KY627"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<String | null>(null);
  const [refreshToken, setRefreshToken] = useState<String | null>(null);
  const [email, setEmail] = useState<String | null>(null);
  const [idToken, setIdToken] = useState<String | null>(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    // expoClientId: Platform.OS === 'web' ? '295151000635-9fvj1qebvar82sgp04tn3uksvsttevs3.apps.googleusercontent.com' : 'YOUR_ANDROID_CLIENT_ID', // Replace with your Expo client IDs
    //iosClientId: 'YOUR_IOS_CLIENT_ID', // Replace with your iOS client ID
    //androidClientId: 'YOUR_ANDROID_CLIENT_ID', // Replace with your Android client ID
    webClientId: '295151000635-9fvj1qebvar82sgp04tn3uksvsttevs3.apps.googleusercontent.com', // Replace with your web client ID
    responseType: 'id_token',
    scopes: ['profile', 'email'],
  });

  // Load tokens when the component mounts
  useEffect(() => {
    loadTokens();
  }, []);

  // Watch for authentication responses.
  useEffect(() => {
    console.log("authentication response: ", response)
    if (response?.type === 'success') {
      const { authentication, params } = response;
      if (params) {
        //setAccessToken(authentication.accessToken);
        //fetchUserInfo(authentication.accessToken);
        console.log("response.params: ", params)
        setIdToken(params.id_token)
        verifyIdToken(params.id_token)
      }
    }
  }, [response]);

  // Fetch basic user information from Google’s UserInfo API.
  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await res.json();
      setUser(userData);
      console.log("userData: ", userData)
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const verifyIdToken = async (idToken: string) => {
    console.log("idToken:", idToken)
    if (!idToken) {
      // Alert.alert('Not authenticated', 'Please sign in first.');
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:5000/verify_id_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          // email: user?.email,
        }),
      });
      const data = await response.json();
      console.log("verify_id_token response: ", data)
      if (data.access_token && data.refresh_token) {
        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);
        setEmail(data.email)
        saveTokens(data.access_token, data.refresh_token, data.email);
      }
    } catch (error) {
      console.error('Error verify_id_token: ', error);
    }
  };

  const saveTokens = async (access: string, refresh: string, email: string) => {
    if (Platform.OS === 'web') {
      // On web, use localStorage
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('email', email);
    } else {
      // On mobile, use AsyncStorage
      try {
        await AsyncStorage.setItem('accessToken', access);
        await AsyncStorage.setItem('refreshToken', refresh);
        await AsyncStorage.setItem('email', email);
      } catch (error) {
        console.error('Error saving tokens', error);
      }
    }
  };

  // Function to load tokens on startup (or page refresh on web)
  const loadTokens = async () => {
    if (Platform.OS === 'web') {
      const storedAccess = localStorage.getItem('accessToken');
      const storedRefresh = localStorage.getItem('refreshToken');
      const storedEmail = localStorage.getItem('email');
      if (storedAccess && storedRefresh && storedEmail) {
        setAccessToken(storedAccess);
        setRefreshToken(storedRefresh);
        setEmail(storedEmail);
      }
    } else {
      try {
        const storedAccess = await AsyncStorage.getItem('accessToken');
        const storedRefresh = await AsyncStorage.getItem('refreshToken');
        const storedEmail = await AsyncStorage.getItem('email');
        if (storedAccess && storedRefresh && storedEmail) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
          setEmail(storedEmail);
        }
      } catch (error) {
        console.error('Error loading tokens', error);
      }
    }
  };


  const sampleCall = async () => {
    console.log("accessToken: ", accessToken)
    if (!accessToken) {
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:5000/samplecall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: "123@123.com",
        }),
      });
      const data = await response.json();
      console.log("samplecall response: ", data)
    } catch (error) {
      console.error('Error calling samplecall: ', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return unsubscribe; // Unsubscribe on unmount
  }, []);

  const handleSignIn = async () => {
    promptAsync();
  };

  const handleSignOut = async () => {
      auth.signOut().then(() => {
        setAccessToken(null)
        setRefreshToken(null)
        setUser(null)
        setEmail(null)
      }).catch((error) => {
        console.log(error)
      });
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12'
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          Tap the Explore tab to learn more about what's included in this starter app.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          When you're ready, run{' '}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>

      {email ? (
        <View>
          <ThemedText>Welcome, {email}!</ThemedText>
          <Button title="Sign Out" onPress={handleSignOut} />
        </View>
      ) : (
        <Button title="Sign in with Google" disabled={!request} onPress={handleSignIn} />
      )}
      <Button title="sampleCall" disabled={!request} onPress={sampleCall} />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
