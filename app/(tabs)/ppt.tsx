import React, { useState } from 'react';
import { View, StyleSheet, Platform, Button, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function FileUploadScreen() {
  const [fileUri, setFileUri] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

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
            setFileUri(fileUri);

            console.log('File selected:', fileName);
          }
        };
        input.click();
      } else {
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
          setFileName(fileName);
          setFileUri(fileUri);

          console.log('File selected:', fileName);
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Could not upload the file. Please try again.');
    }
  };

  const handleUploadToBackend = async () => {
    if (!fileBlob || !fileName) {
      Alert.alert('No file selected', 'Please upload a file first.');
      return;
    }

    try {
      console.log('fileBlob:', fileBlob);
      console.log('fileName:', fileName);

      const formData = new FormData();
      formData.append('file', fileBlob);
      const uploadResponse = await fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        Alert.alert('Success', 'File uploaded successfully!');
      } else {
        Alert.alert('Error', 'Failed to upload file to backend.');
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
              <WebView source={{ uri: `https://docs.google.com/viewer?url=${fileUri}` }} style={styles.webview} />
            )}
          </ThemedView>
        )}

        {fileBlob && (
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
