import React, { useState } from 'react';
import { View, StyleSheet, Platform, Button, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function FileUploadScreen() {
  const [fileUri, setFileUri] = useState<string | null | undefined>(null);;
  const [fileType, setFileType] = useState<string | null | undefined>(null);;

  const handleFileUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.ppt,.pptx';
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            const fileUrl = URL.createObjectURL(file);
            setFileUri(fileUrl);
            setFileType(file.type);
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
            Alert.alert('File upload cancelled');
        } else {
            setFileUri(result.assets[0].uri);
            setFileType(result.assets[0].mimeType);
            console.log('File selected:', result);
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Could not upload the file. Please try again.');
    }
  };

  const handleUploadToBackend = async () => {
    if (!fileUri) {
      Alert.alert('No file selected', 'Please upload a file first.');
      return;
    }

    try {
      const response = await fetch('https://mybackend.com/myapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUri,
          fileType,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'File reference sent to backend successfully!');
      } else {
        Alert.alert('Error', 'Failed to send file to backend.');
      }
    } catch (error) {
      console.error('Error sending file to backend:', error);
      Alert.alert('Error', 'An error occurred while uploading the file.');
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerTitle={<ThemedText type="title">Upload and View File</ThemedText>}
    >
      <ThemedView style={styles.container}>
        <Button title="Upload File" onPress={handleFileUpload} />

        {fileUri && (
          <ThemedView style={styles.previewContainer}>
            <ThemedText type="subtitle">File Preview:</ThemedText>
            {fileType === 'application/pdf' ? (
              <WebView source={{ uri: fileUri }} style={styles.webview} />
            ) : (
              <WebView source={{ uri: "https://docs.google.com/viewer?url="+fileUri }} style={styles.webview} />
              //<ThemedText>{`File selected: ${fileUri.split('/').pop()}`}</ThemedText>
            )}
          </ThemedView>
        )}

        {fileUri && (
          <Button title="Send File to Backend" onPress={handleUploadToBackend} />
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  previewContainer: {
    marginTop: 16,
    gap: 8,
  },
  webview: {
    height: 400,
    width: '100%',
    marginTop: 16,
  },
});
