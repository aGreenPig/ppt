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
// https://gb9i2r5dmg.execute-api.us-east-1.amazonaws.com/dev
// https://vwvflsztz4.execute-api.us-east-1.amazonaws.com/prod
export const backendDomain = __DEV__ ? 'http://127.0.0.1:5000' : 'https://gb9i2r5dmg.execute-api.us-east-1.amazonaws.com/dev'

export const authRedirectUrl = __DEV__ ? 'http://localhost:8081' : "https://agreenpig.github.io/ppt/"

export const stripeKey = __DEV__ ? 'pk_test_51HPJqWDahoKKsJZphETtLtPQRI0cOW6syAkyc1LHQHgLPCqoT8EYuF3yHJ2N28JLS8RqBr9Bg7m4KlsIDnuVnWNU004gUQkPKn' : "pk_live_51HPJqWDahoKKsJZpZkh3gEstHXISz3NkjnDSdmbFDuEz7yZEXP8XO5pIQhNWiojxaOw13U9Pta9TgCPRxS8SDgs300cNz6Bp2C"
export const subscriptionPriceId = __DEV__ ? 'price_1R5xUzDahoKKsJZpiXtwGX96' : "price_1RLz8NDahoKKsJZp3qCycwe4"
export const oneTimePriceId = __DEV__ ? 'price_1R5xVqDahoKKsJZpuazt51ry' : "price_1R5xY1DahoKKsJZpuK7YMYx9"