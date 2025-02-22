import React, { useState, useEffect } from 'react';
import { Button, Image, StyleSheet, Platform, Alert, View, ScrollView, Dimensions, TouchableOpacity, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { loadStripe } from '@stripe/stripe-js';
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
  const [userId, setUserId] = useState<String | null>(null);

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // new file
  const [fileType, setFileType] = useState<string>("");
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');
  const [grade, setGrade] = useState('');

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
    console.log("Global.authRedirectUrl: ", Global.authRedirectUrl)
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
        setUserId(data.user_id);
        setEmail(data.email);
        saveTokens(data.access_token, data.refresh_token, data.email, data.userId);
      }
    } catch (error) {
      console.error('Error verify_id_token: ', error);
    }
  };

  const saveTokens = async (access: string, refresh: string, email: string, userId: string) => {
    if (Platform.OS === 'web') {
      // On web, use localStorage
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('email', email);
      localStorage.setItem('userId', userId);
    } else {
      // On mobile, use AsyncStorage
      try {
        await AsyncStorage.setItem('accessToken', access);
        await AsyncStorage.setItem('refreshToken', refresh);
        await AsyncStorage.setItem('email', email);
        localStorage.setItem('userId', userId);
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
      const userId = localStorage.getItem('userId');
      if (storedAccess && storedRefresh && storedEmail) {
        setAccessToken(storedAccess);
        setRefreshToken(storedRefresh);
        setEmail(storedEmail);
        setUserId(userId);
      }
    } else {
      try {
        const storedAccess = await AsyncStorage.getItem('accessToken');
        const storedRefresh = await AsyncStorage.getItem('refreshToken');
        const storedEmail = await AsyncStorage.getItem('email');
        const userId = await AsyncStorage.getItem('userId');
        if (storedAccess && storedRefresh && storedEmail) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
          setEmail(storedEmail);
          setUserId(userId);
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
      formData.append('metadata', JSON.stringify({ courseName: courseName, grade: grade }));
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

  const goToPreviousImage = () => {
    if (selectedFile && selectedFile.per_image && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };
  const goToNextImage = () => {
    if (selectedFile && selectedFile.per_image && currentImageIndex < selectedFile.per_image.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePayment = async () => {
    const stripe = await loadStripe('pk_test_51HPJqWDahoKKsJZphETtLtPQRI0cOW6syAkyc1LHQHgLPCqoT8EYuF3yHJ2N28JLS8RqBr9Bg7m4KlsIDnuVnWNU004gUQkPKn');
    console.log("stripe: ", stripe)
    console.log("userId: ", userId)
    if (stripe && userId) {
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: 'price_1Qv2jpDahoKKsJZpgsLyKG0k', quantity: 1 }],
        mode: 'subscription', // 'payment' | 'subscription';
        clientReferenceId: userId.toString(),
        successUrl: `${window.location.origin}`,
        cancelUrl: window.location.origin,
      });

      if (error) {
        console.log('Stripe Error:', error);
      }
    } else {
      console.log('Stripe is null!');
    }
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

      {email && (
        <>
          {/* (c) New file upload Section */}
          <ThemedView style={styles.sectionContainer}>
            <ThemedText style={styles.sectionHeader}>New Annotation</ThemedText>
            <View style={styles.buttonContainer}>
              <Button title={fileName ? "Change File" : "Select File"} onPress={handleFileUpload} />
            </View>
            {fileName && (
              <>
                <ThemedText style={styles.fileNameText}>Selected File: {fileName}</ThemedText>
                {/* (f) Metadata Form */}
                <View style={styles.formContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Course Name"
                    value={courseName}
                    onChangeText={setCourseName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Grade"
                    value={grade}
                    onChangeText={setGrade}
                  />
                  <View style={styles.buttonContainer}>
                    <Button title="Upload File" onPress={handleUploadToBackend} />
                  </View>
                </View>
              </>
            )}
          </ThemedView>

          {/* My Annotations Section */}
          <ThemedView style={styles.sectionContainer}>
            <ThemedText style={styles.sectionHeader}>My Annotations</ThemedText>
            <View style={styles.buttonContainer}>
              <Button title="Load Files" onPress={getAllFiles} />
            </View>
            
            {selectedFile && (
              <View style={styles.fileViewContainer}>
                {allFiles.length > 0 && (
                  <>
                    <ThemedText style={styles.sectionSubHeader}>Select a File</ThemedText>
                    <Picker
                      selectedValue={selectedFile.id}
                      onValueChange={(itemValue) => {
                        const file = allFiles.find((f) => f.id === itemValue);
                        setSelectedFile(file || null);
                        setCurrentImageIndex(0);
                      }}
                      style={styles.picker}
                    >
                      {allFiles.map((file) => (
                        <Picker.Item key={file.id} label={`File ${file.id}`} value={file.id} />
                      ))}
                    </Picker>
                  </>
                )}
                {/* (e) Display Summary */}
                <ThemedText style={styles.summaryText}>Summary: {selectedFile.summary}</ThemedText>
                {selectedFile.per_image && selectedFile.per_image.length > 0 && (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: selectedFile.per_image[currentImageIndex].path }}
                      style={[styles.image, { width: deviceWidth * 0.95, height: 500 }]}
                      resizeMode="contain"
                    />
                    <ThemedText style={styles.captionText}>
                      {selectedFile.per_image[currentImageIndex].llm}
                    </ThemedText>
                    {/* (d) Navigation Buttons for per_image */}
                    <View style={styles.navigationContainer}>
                      <TouchableOpacity onPress={goToPreviousImage} style={styles.navButton}>
                        <ThemedText style={styles.navButtonText}>Previous</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={goToNextImage} style={styles.navButton}>
                        <ThemedText style={styles.navButtonText}>Next</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ThemedView>

         <View style={styles.buttonContainer}>
            <Button title="Get Your Fortune" onPress={handlePayment} />
          </View>
          {/* (Optional) sampleCall for debugging */}
          <View style={styles.buttonContainer}>
            <Button title="sampleCall" onPress={sampleCall} />
          </View>
        </>
      )}

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
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
  uploadTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
  },
  authenticatedContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  // (b) Button container style to limit width
  buttonContainer: {
    marginVertical: 10,
    alignSelf: 'center',
    width: '80%',
  },
  sectionContainer: {
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f4f7',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubHeader: {
    fontSize: 18,
    fontWeight: '500',
    marginVertical: 8,
    textAlign: 'center',
  },
  fileNameText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 8,
  },
  formContainer: {
    marginTop: 12,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  fileViewContainer: {
    marginTop: 16,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    borderRadius: 8,
    marginBottom: 8,
  },
  captionText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginVertical: 10,
  },
  navButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  picker: {
    marginHorizontal: 16,
    alignItems: 'center',
    width: '50%',
    height: 30,
  },
});
