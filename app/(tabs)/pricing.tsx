import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { MaterialIcons } from '@expo/vector-icons';

export default function PricingScreen() {
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
        <ThemedText type="title" style={styles.title}>Pricing Plans</ThemedText>
        
        {/* Monthly Subscription Card */}
        <ThemedView style={styles.pricingCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="update" size={32} color="#4CAF50" />
            <ThemedText type="subtitle" style={styles.planTitle}>Monthly Subscription</ThemedText>
          </View>
          <ThemedText style={styles.price}>$4.99</ThemedText>
          <ThemedText style={styles.period}>per month</ThemedText>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <ThemedText style={styles.featureText}>600 credits monthly</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <ThemedText style={styles.featureText}>Auto-renewal</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <ThemedText style={styles.featureText}>Cancel anytime</ThemedText>
            </View>
          </View>
          <TouchableOpacity style={styles.subscribeButton}>
            <ThemedText style={styles.buttonText}>Subscribe Now</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* One-time Purchase Card */}
        <ThemedView style={styles.pricingCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="shopping-cart" size={32} color="#2196F3" />
            <ThemedText type="subtitle" style={styles.planTitle}>One-time Purchase</ThemedText>
          </View>
          <ThemedText style={styles.price}>$5.99</ThemedText>
          <ThemedText style={styles.period}>one-time payment</ThemedText>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={20} color="#2196F3" />
              <ThemedText style={styles.featureText}>600 instant credits</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={20} color="#2196F3" />
              <ThemedText style={styles.featureText}>No subscription required</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={20} color="#2196F3" />
              <ThemedText style={styles.featureText}>Credits never expire</ThemedText>
            </View>
          </View>
          <TouchableOpacity style={[styles.subscribeButton, styles.oneTimeButton]}>
            <ThemedText style={styles.buttonText}>Purchase Credits</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Credit Usage Info */}
        <ThemedView style={styles.infoCard}>
          <MaterialIcons name="info" size={24} color="#FFA000" />
          <ThemedText style={styles.infoText}>
            Each slide processed will consume 1 credit. Credits are used to analyze and annotate your slides with AI-powered insights.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '600',
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#444',
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  oneTimeButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
    color: '#5D4037',
    fontSize: 14,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
}); 