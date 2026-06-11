/**
 * Tolee Push Notification Testing Tool
 * 
 * Usage:
 *   node scratch/test-push.js <FCM_REGISTRATION_TOKEN> [title] [body]
 * 
 * Example:
 *   node scratch/test-push.js dV_x1w3tSy... "Test Notification" "Hello from Tolee!"
 */

const fs = require('fs');
const path = require('path');

// 1. Load environment variables from apps/web/.env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = require('dotenv').config({ path: envPath });
  console.log('[DEBUG] Loaded .env environment variables successfully.');
} else {
  console.warn('[WARNING] No .env file found at: ' + envPath);
}

// 2. Import firebase-admin
let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error('[ERROR] firebase-admin package is not installed. Please install it with "npm install firebase-admin" or run this inside apps/web folder.');
  process.exit(1);
}

// 3. Initialize Firebase SDK
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
let serviceAccount = null;

if (serviceAccountJson) {
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
    console.log('[DEBUG] Initializing using FIREBASE_SERVICE_ACCOUNT_JSON...');
  } catch (jsonErr) {
    console.error('[ERROR] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON env variable as JSON:', jsonErr);
  }
}

// Fallback to individual credentials
if (!serviceAccount || (!serviceAccount.project_id && !serviceAccount.projectId)) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    console.log('[DEBUG] Initializing using individual FIREBASE_ env variables...');
    serviceAccount = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }
}

if (!serviceAccount) {
  console.error('\n[FATAL] No Firebase credentials found! Please configure your Firebase Service Account.');
  console.log('You must set either:');
  console.log('  1. FIREBASE_SERVICE_ACCOUNT_JSON');
  console.log('  OR');
  console.log('  2. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
  console.log('in your apps/web/.env file.\n');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('[SUCCESS] Firebase Admin SDK initialized successfully.');
} catch (err) {
  console.error('[FATAL] Failed to initialize Firebase Admin SDK:', err);
  process.exit(1);
}

// 4. Parse Arguments
const args = process.argv.slice(2);
const token = args[0];
const title = args[1] || '🔔 Tolee Push Test';
const body = args[2] || 'Vibration, sound, and background delivery are working!';

if (!token) {
  console.log('\n=======================================');
  console.log('TOLEE PUSH NOTIFICATION TESTER');
  console.log('=======================================');
  console.log('Usage:');
  console.log('  node scratch/test-push.js <FCM_TOKEN> [title] [body]');
  console.log('\nTo get your FCM token:');
  console.log('  1. Install Tolee APK on your Android device');
  console.log('  2. Open the app and log in');
  console.log('  3. Under chrome://inspect (or Android Studio logcat), copy the registration token value');
  console.log('=======================================\n');
  process.exit(0);
}

// 5. Build High-Priority Android Payload
const message = {
  token: token,
  notification: {
    title: title,
    body: body,
  },
  data: {
    type: 'chat',
    url: '/chat',
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'messages', // high-priority direct message channel
      priority: 'high',
      sound: 'default',
      vibrateTimingsMillis: [0, 500, 200, 500],
      visibility: 'public', // Show fully on lock screen
    },
  },
  apns: {
    payload: {
      aps: {
        alert: {
          title: title,
          body: body,
        },
        sound: 'default',
      },
    },
  },
};

console.log('\n[INFO] Sending push payload:');
console.log(JSON.stringify(message, null, 2));
console.log('\nSending request to FCM server...');

admin.messaging().send(message)
  .then((response) => {
    console.log('\n[SUCCESS] Push notification sent successfully!');
    console.log('FCM Message ID:', response);
    console.log('Check your mobile device now!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[ERROR] Failed to send push notification via FCM:', error);
    process.exit(1);
  });
