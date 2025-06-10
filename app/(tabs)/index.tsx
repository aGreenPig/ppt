import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Button, Image, StyleSheet, Platform, Alert, View, ScrollView, Dimensions, TouchableOpacity, TextInput, Text, KeyboardAvoidingView } from 'react-native';
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
import { MaterialIcons } from '@expo/vector-icons';

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

interface CustomAlertProps {
  isVisible: boolean;
  onClose: () => void;
  message: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: number;
}

interface Conversation {
  slideId: string;
  messages: Message[];
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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  // Add this after other useEffect hooks
  useEffect(() => {
    if (selectedFile && selectedFile.per_image && selectedFile.per_image[currentImageIndex]) {
      const slideId = String(currentImageIndex);
      loadConversation(selectedFile.id, slideId);
    }
  }, [selectedFile, currentImageIndex]);

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
      setAccessToken(storedAccess);
      setRefreshToken(storedRefresh);
      setEmail(storedEmail);
      setUserId(userId);
    } else {
      try {
        const storedAccess = await AsyncStorage.getItem('accessToken');
        const storedRefresh = await AsyncStorage.getItem('refreshToken');
        const storedEmail = await AsyncStorage.getItem('email');
        const userId = await AsyncStorage.getItem('userId');
        setAccessToken(storedAccess);
        setRefreshToken(storedRefresh);
        setEmail(storedEmail);
        setUserId(userId);
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
      if (data.data && data.data.id) {
        setUserId(data.data.id);
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

  const CustomAlert = ({ isVisible, onClose, message }: CustomAlertProps) => (
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
    // Validate userId early
    if (typeof userId !== 'string' || !userId.trim()) {
      console.error('Invalid userId: ', userId);
      return;
    }
    console.log("userId: ", userId, "; userId.toString(): ", userId.toString())

    const stripe = await loadStripe(Global.stripeKey);
    var mode: 'subscription' | 'payment' = 'subscription';
    var priceId: string = Global.subscriptionPriceId;
    if (action == 'onetime') {
      mode = 'payment';
      priceId = Global.oneTimePriceId;
    }
    if (!stripe) {
      console.error('Stripe not loaded');
      return;
    }
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

  const loadConversation = async (fid: string, slideId: string) => {
    try {
      const response = await fetch(Global.backendDomain + '/get_conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          fid: fid,
          slide_id: slideId,
        }),
      });
      const data = await response.json();
      console.log("get_conversation response: ", data);
      if (data.data && data.data.messages) {
        setConversations(prev => {
          const existing = prev.find(c => c.slideId === slideId);
          if (existing) {
            return prev.map(c => c.slideId === slideId ? { ...c, messages: data.data.messages } : c);
          }
          return [...prev, { slideId, messages: data.data.messages }];
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedFile || !selectedFile.per_image || !selectedFile.per_image[currentImageIndex]) return;

    const slideId = String(currentImageIndex);
    console.log("selectedFile: ", selectedFile);
    console.log("conversations: ", conversations);
    const newMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      isUser: true,
      timestamp: Date.now(),
    };

    // Update local state immediately for better UX
    setConversations(prev => {
      const existing = prev.find(c => c.slideId === slideId);
      if (existing) {
        return prev.map(c => c.slideId === slideId ? { ...c, messages: [...c.messages, newMessage] } : c);
      }
      return [...prev, { slideId, messages: [newMessage] }];
    });

    setCurrentMessage('');
    setIsSending(true);

    try {
      const response = await fetch(Global.backendDomain + '/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fid: selectedFile.id,
          slide_id: slideId,
          message: currentMessage,
          annotation: selectedFile.per_image[currentImageIndex].annotation,
        }),
      });

      const data = await response.json();
      console.log("chat response: ", data);
      if (data.data && data.data.response) {
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: data.data.response,
          isUser: false,
          timestamp: Date.now(),
        };

        setConversations(prev => {
          const existing = prev.find(c => c.slideId === slideId);
          if (existing) {
            return prev.map(c => c.slideId === slideId ? { ...c, messages: [...c.messages, aiResponse] } : c);
          }
          return [...prev, { slideId, messages: [newMessage, aiResponse] }];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedFile || !selectedFile.per_image || !selectedFile.per_image[currentImageIndex]) return;

    const slideId = String(currentImageIndex);
    try {
      const response = await fetch(Global.backendDomain + '/delete_conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fid: selectedFile.id,
          slide_id: slideId,
        }),
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.slideId !== slideId));
        Alert.alert('Success', 'Conversation deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
    }
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
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Welcome!</ThemedText>
          <HelloWave />
        </ThemedView>

        {/* Hero Section */}
        <ThemedView style={styles.heroContainer}>
          <ThemedText type="subtitle" style={styles.heroTitle}>
            Transform Your Slides into Smart Notes
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Let AI help you understand and organize your lecture slides better
          </ThemedText>
        </ThemedView>

        {/* Feature Cards */}
        <ThemedView style={styles.featureContainer}>
          <ThemedText style={styles.sectionTitle}>Smart Features</ThemedText>
          <View style={styles.featureGrid}>
            <ThemedView style={styles.featureCard}>
              <MaterialIcons name="text-fields" size={32} color="#4CAF50" />
              <ThemedText style={styles.featureTitle}>Text Extraction</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Extract and organize text from your slides
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureCard}>
              <MaterialIcons name="image" size={32} color="#2196F3" />
              <ThemedText style={styles.featureTitle}>Visual Analysis</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Understand diagrams and images
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureCard}>
              <MaterialIcons name="table-chart" size={32} color="#FF9800" />
              <ThemedText style={styles.featureTitle}>Table Processing</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Extract and format table data
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureCard}>
              <MaterialIcons name="lightbulb" size={32} color="#9C27B0" />
              <ThemedText style={styles.featureTitle}>Key Concepts</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Highlight important points
              </ThemedText>
            </ThemedView>
          </View>
        </ThemedView>

        {email ? (
          <>
            {/* User Welcome Section */}
            <ThemedView style={styles.sectionContainer}>
              <View style={styles.userHeader}>
                <MaterialIcons name="account-circle" size={24} color="#fff" />
                <ThemedText style={styles.welcomeText}>Welcome, {email}!</ThemedText>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <MaterialIcons name="logout" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Subscription Status */}
              {subscription && subscription.until !== null && subscription.credit_balance !== null && (
                <ThemedView style={styles.subscriptionCard}>
                  <View style={styles.subscriptionHeader}>
                    <MaterialIcons name="card-membership" size={24} color="#4CAF50" />
                    <ThemedText style={styles.subscriptionTitle}>Subscription Status</ThemedText>
                  </View>
                  <View style={styles.subscriptionInfo}>
                    <ThemedText style={styles.creditText}>
                      Remaining Credits: {subscription.credit_balance}
                    </ThemedText>
                    {subscription.until >= 9999999998 ? (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.cancelButton]} 
                        onPress={() => handleModifySubscription("CANCEL")}
                      >
                        <ThemedText style={styles.buttonText}>Cancel Subscription</ThemedText>
                      </TouchableOpacity>
                    ) : subscription.until > Math.floor(Date.now() / 1000) ? (
                      <>
                        <ThemedText style={styles.expiryText}>
                          Expires: {new Date(subscription.until * 1000).toLocaleDateString()}
                        </ThemedText>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.reactivateButton]} 
                          onPress={() => handleModifySubscription("REACTIVATE")}
                        >
                          <ThemedText style={styles.buttonText}>Reactivate</ThemedText>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.subscribeButton]} 
                        onPress={() => handlePayment("subscription")}
                      >
                        <ThemedText style={styles.buttonText}>Get Subscription</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </ThemedView>
              )}

              {/* File Upload Section */}
              <ThemedView style={styles.uploadSection}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="cloud-upload" size={24} color="#2196F3" />
                  <ThemedText style={styles.sectionTitle}>Upload New Slides</ThemedText>
                </View>
                <TouchableOpacity 
                  style={styles.uploadButton} 
                  onPress={handleFileUpload}
                >
                  <MaterialIcons name="add" size={24} color="#fff" />
                  <ThemedText style={styles.uploadButtonText}>
                    {fileName ? "Change File" : "Select PDF File"}
                  </ThemedText>
                </TouchableOpacity>

                {fileName && (
                  <ThemedView style={styles.uploadForm}>
                    <ThemedText style={styles.fileNameText}>Selected: {fileName}</ThemedText>
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
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.uploadButton]} 
                      onPress={handleUploadToBackend}
                    >
                      <ThemedText style={styles.buttonText}>Process Slides</ThemedText>
                    </TouchableOpacity>
                    {uploadLoading && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2196F3" />
                        <ThemedText style={styles.loadingText}>
                          Processing your slides...
                        </ThemedText>
                      </View>
                    )}
                  </ThemedView>
                )}
              </ThemedView>

              {/* My Slides Section */}
              <ThemedView style={styles.slidesSection}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="collections" size={24} color="#FF9800" />
                  <ThemedText style={styles.sectionTitle}>My Slides</ThemedText>
                </View>
                <TouchableOpacity 
                  style={styles.loadButton} 
                  onPress={() => getAllFiles("*")}
                >
                  <MaterialIcons name="refresh" size={24} color="#fff" />
                  <ThemedText style={styles.buttonText}>Load All Slides</ThemedText>
                </TouchableOpacity>

                {selectedFile && (
                  <ThemedView style={styles.fileViewContainer}>
                    {allFiles.length > 0 && (
                      <View style={styles.fileSelector}>
                        <ThemedText style={styles.selectorLabel}>Select a File:</ThemedText>
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
                            <Picker.Item key={file.id} label={file.name} value={file.id} />
                          ))}
                        </Picker>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.deleteButton]} 
                          onPress={handleDeleteFile}
                        >
                          <MaterialIcons name="delete" size={24} color="#fff" />
                          <ThemedText style={styles.buttonText}>Delete File</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}

                    <ThemedText style={styles.summaryText}>
                      Summary: {selectedFile.summary}
                    </ThemedText>

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
                        <View style={styles.navigationContainer}>
                          <TouchableOpacity 
                            style={[styles.navButton, currentImageIndex === 0 && styles.disabledButton]} 
                            onPress={goToPreviousImage}
                            disabled={currentImageIndex === 0}
                          >
                            <MaterialIcons name="chevron-left" size={24} color="#fff" />
                            <ThemedText style={styles.navButtonText}>Previous</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[
                              styles.navButton, 
                              currentImageIndex === selectedFile.per_image.length - 1 && styles.disabledButton
                            ]} 
                            onPress={goToNextImage}
                            disabled={currentImageIndex === selectedFile.per_image.length - 1}
                          >
                            <ThemedText style={styles.navButtonText}>Next</ThemedText>
                            <MaterialIcons name="chevron-right" size={24} color="#fff" />
                          </TouchableOpacity>
                        </View>

                        {/* Chat Interface */}
                        <ThemedView style={styles.chatContainer}>
                          <View style={styles.chatHeader}>
                            <ThemedText style={styles.chatTitle}>Ask about this slide</ThemedText>
                            <TouchableOpacity 
                              style={styles.deleteChatButton} 
                              onPress={handleDeleteConversation}
                            >
                              <MaterialIcons name="delete" size={20} color="#F44336" />
                              <ThemedText style={styles.deleteChatText}>Clear Chat</ThemedText>
                            </TouchableOpacity>
                          </View>

                          <ScrollView 
                            style={styles.messagesContainer}
                            contentContainerStyle={styles.messagesContent}
                          >
                            {conversations.find(c => c.slideId === String(currentImageIndex))?.messages.map((message) => (
                              <View 
                                key={message.id} 
                                style={[
                                  styles.messageBubble,
                                  message.isUser ? styles.userMessage : styles.aiMessage
                                ]}
                              >
                                <ThemedText style={styles.messageText}>{message.content}</ThemedText>
                                <ThemedText style={styles.messageTime}>
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </ThemedText>
                              </View>
                            ))}
                          </ScrollView>

                          <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.inputContainer}
                          >
                            <TextInput
                              style={styles.messageInput}
                              value={currentMessage}
                              onChangeText={setCurrentMessage}
                              placeholder="Ask a question about this slide..."
                              multiline
                              maxLength={200}
                            />
                            <ThemedText>
                              {currentMessage.length}/200
                            </ThemedText>
                            <TouchableOpacity 
                              style={[styles.sendButton, (!currentMessage.trim() || isSending) && styles.disabledButton]} 
                              onPress={handleSendMessage}
                              disabled={!currentMessage.trim() || isSending}
                            >
                              {isSending ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <MaterialIcons name="send" size={24} color="#fff" />
                              )}
                            </TouchableOpacity>
                          </KeyboardAvoidingView>
                        </ThemedView>
                      </View>
                    )}
                  </ThemedView>
                )}
              </ThemedView>
            </ThemedView>
          </>
        ) : (
          <ThemedView style={styles.authContainer}>
            <MaterialIcons name="login" size={24} color="#fff" />
            <ThemedText style={styles.authTitle}>Get Started</ThemedText>
            <ThemedText style={styles.authSubtitle}>
              Sign in to start transforming your slides
            </ThemedText>
            <TouchableOpacity 
              style={styles.signInButton} 
              disabled={!request} 
              onPress={handleSignIn}
            >
              <MaterialIcons name="account-circle" size={24} color="#fff" />
              <ThemedText style={styles.buttonText}>Sign in with Google</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        <CustomAlert
          isVisible={alertVisible}
          onClose={() => setAlertVisible(false)}
          message={alertMessage}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  heroContainer: {
    marginBottom: 32,
    padding: 24,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1565C0',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#424242',
  },
  featureContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 32,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    marginLeft: 8,
    flex: 1,
  },
  signOutButton: {
    padding: 8,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  subscriptionInfo: {
    gap: 8,
  },
  creditText: {
    fontSize: 16,
    color: '#666',
  },
  expiryText: {
    fontSize: 14,
    color: '#FF9800',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  reactivateButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadForm: {
    marginTop: 16,
    gap: 12,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  slidesSection: {
    marginBottom: 24,
  },
  loadButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  fileSelector: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  fileViewContainer: {
    gap: 16,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#424242',
  },
  imageContainer: {
    gap: 16,
  },
  image: {
    borderRadius: 8,
  },
  captionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  fileNameText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  chatContainer: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteChatText: {
    color: '#F44336',
    fontSize: 14,
  },
  messagesContainer: {
    maxHeight: 300,
  },
  messagesContent: {
    padding: 12,
    gap: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
