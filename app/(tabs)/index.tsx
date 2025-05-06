import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Button, Image, StyleSheet, Platform, Alert, View, ScrollView, Dimensions, TouchableOpacity, TextInput, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import * as WebBrowser from 'expo-web-browser';
import * as DocumentPicker from 'expo-document-picker';
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { loadStripe } from '@stripe/stripe-js';
import * as Global from '../lib/global';
import Modal from 'react-native-modal';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

WebBrowser.maybeCompleteAuthSession();

const app = initializeApp(Global.firebaseConfig);
const auth = getAuth(app);

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_TIME_MS = 1 * 60_000;

interface PerImage {
  path: string;
  annotation: string;
}

interface FileData {
  id: string;
  name: string;
  summary: string;
  per_image: PerImage[];
}

interface SubscriptionInfo {
  id: number;
  until: number | null;
  credit_balance: number | null;
}

export default function HomeScreen() {
  // access related
  const [accessToken, setAccessToken] = useState<String | null>(null);
  const [refreshToken, setRefreshToken] = useState<String | null>(null);
  const [email, setEmail] = useState<String | null>(null);
  const [idToken, setIdToken] = useState<String | null>(null);
  const [userId, setUserId] = useState<String | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

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
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  // Load tokens when the component mounts
  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
    });
    return unsubscribe; // Unsubscribe on unmount
  }, []);

  // Fetch user data when accessToken is available
  useEffect(() => {
    if (accessToken) {
      getUserData();
    }
  }, [accessToken]);

  /////
  // authentication related functions
  /////
  const handleSignIn = async () => {
    promptAsync();
  };

  const handleSignOut = async () => {
    auth.signOut().then(() => {
      setAccessToken(null)
      setRefreshToken(null)
      setEmail(null)
      setUserId(null)
      if (Platform.OS === 'web') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('email');
        localStorage.removeItem('userId');
      } else {
        try {
          AsyncStorage.removeItem('accessToken');
          AsyncStorage.removeItem('refreshToken');
          AsyncStorage.removeItem('email');
          AsyncStorage.removeItem('userId');
        } catch (error) {
          console.error('Error clearing tokens: ', error);
        }
      }
    }).catch((error) => {
      console.error(error)
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
        setIdToken(params.id_token)
        verifyIdToken(params.id_token)
      }
    }
  }, [response]);

  const verifyIdToken = async (idToken: string) => {
    console.log("idToken:", idToken)
    if (!idToken) {
      console.error('No idToken provided');
      return;
    }
    try {
      const response = await fetch(Global.backendDomain + '/verify_id_token', {
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
        setEmail(data.email);
        setUserId(data.user_id);
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
        await AsyncStorage.setItem('userId', userId);
      } catch (error) {
        console.error('Error saving tokens: ', error);
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
      if (storedAccess && storedRefresh && storedEmail && userId) {
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
        if (storedAccess && storedRefresh && storedEmail && userId) {
          setAccessToken(storedAccess);
          setRefreshToken(storedRefresh);
          setEmail(storedEmail);
          setUserId(userId);
        }
      } catch (error) {
        console.error('Error loading tokens: ', error);
      }
    }
  };

  const getUserData = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(Global.backendDomain + '/get_user_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      console.log('get_user_data response: ', data);
      if (data.data && data.data.subscription) {
        setSubscription(data.data.subscription);
      }
    } catch (error) {
      console.error('Error fetching user data: ', error);
      handleSignOut();
    }
  };

  /////
  // file related functions
  /////
  const getAllFiles = async (file_id: string) => {
    if (!accessToken) {
      console.error('No access token available');
      return;
    }
    try {
      const response = await fetch(Global.backendDomain + '/get_all_files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fid: file_id }),
      });
      const data = await response.json();
      console.log('get_all_files response: ', data);
      if (data.data.files) {
        setAllFiles(data.data.files);
        if (data.data.files.length > 0) {
          setSelectedFile(data.data.files[0]);
        } else if (file_id == "*") {
          setSelectedFile(null);
          setAlertVisible(true);
          setAlertMessage("No files found! Please upload a file first.");
        }
      }
      return data.data.files;
    } catch (error) {
      console.error('Error fetching all files:', error);
    }
  };

  async function pollForFiles(fid: string) {
    const start = Date.now();
    while (Date.now() - start < MAX_POLL_TIME_MS) {
      console.log('Polling for files...', fid);
      const resp = await getAllFiles(fid);
      if (resp.length > 0) {
        console.log('File found: ', fid, resp);
        return;
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error('Timeout waiting for file: ' + fid);
  }

  const handleFileUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf'; // '.pdf,.ppt,.pptx';
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
            //'application/vnd.ms-powerpoint',
            //'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
    }
  };

  const handleUploadToBackend = async () => {
    setUploadLoading(true);
    if (!fileBlob || !fileName) {
      console.error('No file selected');
      return;
    }
    try {
      console.log('fileBlob:', fileBlob, '; fileName:', fileName);
      const formData = new FormData();
      formData.append('file', fileBlob);
      formData.append('metadata', JSON.stringify({ course_name: courseName, grade: grade }));
      await setAllFiles([]); // Clear the list of files before uploading
      const response = await fetch(Global.backendDomain + '/upload_file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('upload_file response: ', data);
        if (data.error) {
          setAlertVisible(true);
          setAlertMessage(data.message);
        }
        await pollForFiles(data.data.fid);
        await getUserData();
      } else {
        console.error('Error uploading file:', response);
      }
    } catch (error) {
      console.error('Error sending file to backend:', error);
    } finally {
      // Turn off loading state.
      setUploadLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedFile || !selectedFile.id) {
      console.error('No file selected for deletion');
      return;
    }
    try {
      const response = await fetch(Global.backendDomain + '/delete_file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fid: selectedFile.id }),
      });
      const data = await response.json();
      console.log("delete_file response: ", data);
      await getAllFiles("*");
    } catch (error) {
      console.error("Error delete_file:", error);
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

  const CustomAlert = ({ isVisible, onClose, message }) => (
    <Modal isVisible={isVisible}>
      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
        <Text>{message}</Text>
        <Button title="OK" onPress={onClose} />
      </View>
    </Modal>
  );

  /////
  // payment related functions
  /////
  const handlePayment = async (action: string) => {
    const stripe = await loadStripe(Global.stripeKey);
    // Validate userId early
    if (typeof userId !== 'string' || !userId.trim()) {
      console.error('Invalid userId: ', userId);
      return;
    }
    console.log("userId: ", userId, "; userId.toString(): ", userId.toString())
    
    var mode: 'subscription' | 'payment' = 'subscription';
    var priceId: string = Global.subscriptionPriceId;
    if (action == 'onetime') {
      mode = 'payment';
      priceId = Global.oneTimePriceId;
    }
    if (stripe) {
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: mode,
        clientReferenceId: userId.toString(),
        successUrl: Global.authRedirectUrl, //`${window.location.origin}`,
        cancelUrl: Global.authRedirectUrl, //window.location.origin,
      });

      if (error) {
        console.error('Stripe Error: ', error);
      }
    } else {
      console.error('Stripe not loaded: ', stripe);
    }
  };

  const handleModifySubscription = async (action: string) => {
    try {
      const response = await fetch(Global.backendDomain + '/modify_subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: action }),
      });
      const data = await response.json();
      console.log("modify_subscription response: ", data);
      if (data.data && data.data.subscription) {
        setSubscription(data.data.subscription);
      }
      await getUserData();
    } catch (error) {
      console.error("Error modify_subscription:", error);
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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
        <ThemedText type="subtitle">Tired of reading long slides from lectures? </ThemedText>
        <ThemedText>
          We are here to help!!
        </ThemedText>
      </ThemedView>

      {/* Feature Cards */}
      <ThemedView style={styles.featureContainer}>
        <ThemedText style={styles.featureTitle}>Introducing Smart Slides!</ThemedText>
        <View style={styles.featureDetails}>
          <ThemedText style={styles.featureItem}>• Extract text, visuals, tables, and key concepts</ThemedText>
          <ThemedText style={styles.featureItem}>• OCR & metadata extraction for complex visuals</ThemedText>
          <ThemedText style={styles.featureItem}>• Auto-highlight definitions, formulas, diagrams, and bullet points</ThemedText>
          <ThemedText style={styles.featureItem}>• Options for concise summaries or detailed explanations</ThemedText>
          <ThemedText style={styles.featureItem}>• External knowledge extensions available</ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={styles.featureContainer}>
        <ThemedText style={styles.pricingTitle}>Pricing</ThemedText>
        <View style={styles.pricingRow}>
          <ThemedText style={styles.pricingLabel}>1 slide will consume 1 credit.</ThemedText>
        </View>
        <View style={styles.pricingRow}>
          <ThemedText style={styles.pricingLabel}>Monthly Subscription: </ThemedText>
          <ThemedText style={styles.pricingValue}>$4.99 / 600 credits load up every month</ThemedText>
        </View>
        <View style={styles.pricingRow}>
          <ThemedText style={styles.pricingLabel}>Onetime Credit Purchase: </ThemedText>
          <ThemedText style={styles.pricingValue}>600 instant credits for $5.99</ThemedText>
        </View>
      </ThemedView>

      {email ? (
        <>
          <ThemedView style={styles.sectionContainer}>
            <ThemedText style={styles.sectionHeader}>Welcome, {email}!</ThemedText>
            <View style={styles.buttonContainer}>
              <Button title="Sign Out" onPress={handleSignOut} />
            </View>
          </ThemedView>
          {subscription && (
            <ThemedView style={styles.sectionContainer}>
              <ThemedText style={styles.sectionHeader}>Subscription Status</ThemedText>
              {subscription.until >= 9999999998 ? (
                <>
                  <ThemedText style={styles.summaryText}>Your subscription is active.</ThemedText>
                  <View style={styles.buttonContainer}>
                    <Button title="Cancel Subscription" onPress={() => handleModifySubscription("CANCEL")} />
                  </View>
                </>
              ) : (
                <>
                  {subscription.until && subscription.until > Math.floor(Date.now() / 1000) ? (
                    <ThemedView>
                      <ThemedText style={styles.summaryText}>
                        Your subscription is canceled and will expire on {new Date(subscription.until * 1000).toLocaleDateString()}.
                      </ThemedText>
                      <Button title="Reactivate Subscription" onPress={() => handleModifySubscription("REACTIVATE")} />
                    </ThemedView>
                  ) : (
                    <ThemedView>
                      <ThemedText style={styles.summaryText}>You do not have an active subscription.</ThemedText>
                      <Button title="New Subscription" onPress={() => handlePayment("subscription")} />
                    </ThemedView>
                  )}
                </>
              )}
              <ThemedText style={styles.summaryText}>Reminging credit: {subscription.credit_balance}</ThemedText>
              <View style={styles.buttonContainer}>
                <Button title="Load Up More Credit" onPress={() => handlePayment("onetime")} />
              </View>
            </ThemedView>
          )}
        </>
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Sign in with Google" disabled={!request} onPress={handleSignIn} />
        </View>
      )}

      <CustomAlert
        isVisible={alertVisible}
        onClose={() => setAlertVisible(false)}
        message={alertMessage}
      />

      {email && (
        <>
          {/* New file upload Section */}
          <ThemedView style={styles.sectionContainer}>
            <ThemedText style={styles.sectionHeader}>Upload New 🆕 Slide For Annotation</ThemedText>
            <View style={styles.buttonContainer}>
              <Button title={fileName ? "Change File" : "Select New Slide (.pdf format)"} onPress={handleFileUpload} />
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
                    {uploadLoading && (
                      <>
                        <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 10 }} />
                        <ThemedText style={{ marginTop: 5 }}>Processing! Please bear with me.</ThemedText>
                      </>
                    )}
                  </View>
                </View>
              </>
            )}
          </ThemedView>

          {/* Current Files Section */}
          <ThemedView style={styles.sectionContainer}>
            <ThemedText style={styles.sectionHeader}>My Slides 🕰</ThemedText>
            <View style={styles.buttonContainer}>
              <Button title="Load All my Historical Slides" onPress={() => getAllFiles("*")} />
            </View>

            {selectedFile && (
              <View style={styles.fileViewContainer}>
                {allFiles.length > 0 && (
                  <>
                    <View style={styles.inlineContainer}>
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
                          <Picker.Item key={file.id} label={`File ${file.name}`} value={file.id} />
                        ))}
                      </Picker>
                    </View>
                    <View style={styles.buttonContainer}>
                      <Button title="Delete Selected File Permanently" onPress={handleDeleteFile} color="#ff4444" />
                    </View>
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
                      {selectedFile.per_image[currentImageIndex].annotation}
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
    marginVertical: 6,
    alignSelf: 'center',
    width: '25%',
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
    marginHorizontal: 10,
    alignItems: 'center',
    width: '50%',
    height: 30,
  },
  inlineContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // New styles for feature cards
  featureContainer: {
    width: '60%',
    alignSelf: 'center',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e8f0fe',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginHorizontal: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDetails: {
    marginLeft: 8,
  },
  featureItem: {
    fontSize: 16,
    marginBottom: 4,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  pricingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  pricingValue: {
    fontSize: 16,
    fontWeight: '400',
  },
});
