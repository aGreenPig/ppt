import React, { useState, useEffect } from 'react';
import { Button, Image, StyleSheet, Platform, Alert, View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import * as Global from './global';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

WebBrowser.maybeCompleteAuthSession();

const app = initializeApp(Global.firebaseConfig);
const auth = getAuth(app);

interface PerImage {
  llm: string;
  path: string;
}

interface FileData {
  id: string;
  summary: string;
  per_image: PerImage[];
}

export default function HomeScreen() {
  // access related
  const [accessToken, setAccessToken] = useState<String | null>(null);
  const [refreshToken, setRefreshToken] = useState<String | null>(null);
  const [email, setEmail] = useState<String | null>(null);
  const [idToken, setIdToken] = useState<String | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: Global.iosClientId,
    //androidClientId: androidClientId,
    webClientId: Global.webClientId,
    responseType: 'id_token',
    scopes: ['profile', 'email'],
    redirectUri: Global.authRedirectUrl,
  });

  // all files
  const [allFiles, setAllFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);

  // new file
  const [fileType, setFileType] = useState<string>("");
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Load tokens when the component mounts
  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
      setEmail(null)
    }).catch((error) => {
      console.log(error)
    });
  };

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

  const verifyIdToken = async (idToken: string) => {
    console.log("idToken:", idToken)
    if (!idToken) {
      // Alert.alert('Not authenticated', 'Please sign in first.');
      return;
    }
    try {
      const response = await fetch(Global.backendDomain+'/verify_id_token', {
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
      const response = await fetch(Global.backendDomain+'/samplecall', {
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

  // --- NEW: get_all_files API call with new response format ---
  const getAllFiles = async () => {
    if (!accessToken) {
      Alert.alert('Not authenticated', 'Please sign in first.');
      return;
    }
    try {
      const response = await fetch(Global.backendDomain+'/get_all_files', {
        method: 'POST', // Adjust the method if needed.
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      console.log('get_all_files response: ', data);
      if (data.data.files) {
        setAllFiles(data.data.files);
        if (data.data.files.length > 0) {
          setSelectedFile(data.data.files[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching all files:', error);
    }
  };

  const handleFileUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.ppt,.pptx';
        input.onchange = async (event: any) => {
          const file = event.target.files[0];
          if (file) {
            const fileBlob = file;
            const fileName = file.name;
            const fileUri = URL.createObjectURL(file);
            setFileBlob(fileBlob);
            setFileName(fileName);
            console.log('File selected:', fileName);
          }
        };
        input.click();
      } else { // mobile
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          Alert.alert('File upload cancelled');
        } else if (result.assets && result.assets[0]) {
          const fileUri = result.assets[0].uri;
          const fileName = result.assets[0].name || fileUri.split('/').pop();
          const fileBlob = await fetch(fileUri).then((res) => res.blob());
          setFileBlob(fileBlob);
          if (fileName) {
            setFileName(fileName);
          }
          console.log('File selected:', fileName);
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Could not upload the file. Please try again.');
    }
  };

  const handleUploadToBackend = async () => {
    console.log(123)
    if (!fileBlob || !fileName) {
      Alert.alert('No file selected', 'Please upload a file first.');
      return;
    }

    try {
      console.log('fileBlob:', fileBlob);
      console.log('fileName:', fileName);

      const formData = new FormData();
      formData.append('file', fileBlob);
      formData.append('metadata', JSON.stringify({ subject: 'Math', course: 'Algebra' }));
      const response = await fetch(Global.backendDomain+'/upload_file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'File uploaded successfully!');
        const data = await response.json();
        console.log('upload_file response: ', data);
        if (data.data.files) {
          setAllFiles(data.data.files);
          if (data.data.files.length > 0) {
            setSelectedFile(data.data.files[0]);
          }
        }

      } else {
        Alert.alert('Error', 'Failed to upload file to backend.');
      }
    } catch (error) {
      console.error('Error sending file to backend:', error);
      Alert.alert('Error', 'An error occurred while uploading the file.');
    }
  };

  const handleFileUploadAndBackend = async () => {
    // First, pick the file.
    await handleFileUpload();
    await handleUploadToBackend();
  };

  const deviceWidth = Dimensions.get('window').width;

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

      {/* --- FILE UPLOAD SECTION --- */}
      <View style={styles.uploadSection}>
        <ThemedText style={styles.uploadTitle}>File Upload</ThemedText>
        <TouchableOpacity style={styles.selectFileButton} onPress={handleFileUpload}>
          <ThemedText style={styles.selectFileButtonText}>
            {fileName ? 'Change File' : 'Select File'}
          </ThemedText>
        </TouchableOpacity>
        {fileName && (
          <View style={styles.selectedFileContainer}>
            <ThemedText style={styles.selectedFileName}>Selected: {fileName}</ThemedText>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadToBackend}>
              <ThemedText style={styles.uploadButtonText}>Upload File</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>


      {/* --- NEW SECTION: Files & Slideshow --- */}
      <View style={styles.fileSection}>
        <Button title="Load Files" onPress={getAllFiles} />
        {allFiles.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Select a File</ThemedText>
            <Picker
              selectedValue={selectedFile?.id}
              onValueChange={(itemValue) => {
                const file = allFiles.find((f) => f.id === itemValue);
                setSelectedFile(file || null);
              }}
            >
              {allFiles.map((file) => (
                <Picker.Item
                  key={file.id}
                  label={`File ${file.id}`} // You can customize the label (e.g. file.summary)
                  value={file.id}
                />
              ))}
            </Picker>
          </>
        )}

        {selectedFile && selectedFile.per_image && selectedFile.per_image.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Slideshow</ThemedText>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={[styles.carousel, { width: deviceWidth }]}
            >
              {selectedFile.per_image.map((item, index) => (
                <View key={index} style={[styles.carouselItem, { width: deviceWidth }]}>
                  <Image
                    source={{ uri: item.path }}
                    style={styles.carouselImage}
                    resizeMode="contain"
                  />
                  <ThemedText style={styles.captionText}>{item.llm}</ThemedText>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </View>
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
  // --- FILE UPLOAD STYLES ---
  uploadSection: {
    marginVertical: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f4f7',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectFileButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: 'center',
  },
  selectFileButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedFileContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 16,
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: '#34a853',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  // --- FILES & SLIDESHOW STYLES ---
  fileSection: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginVertical: 8,
    fontWeight: '600',
  },
  carousel: {
    marginTop: 16,
    height: 300,
  },
  carouselItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  carouselImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  captionText: {
    marginTop: 8,
    fontSize: 16,
    textAlign: 'center',
  },
});
