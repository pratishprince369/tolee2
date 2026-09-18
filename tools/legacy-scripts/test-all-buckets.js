const { initializeApp, getApps, getApp } = require('firebase/app');
const { getStorage, ref, uploadBytes } = require('firebase/storage');

const firebaseConfig = {
  apiKey: "AIzaSyAr0chdj52QyUT53JTW1joyFGhiMLpgrtQ",
  projectId: "tolee2-d244b",
};

const buckets = [
  "tolee2-d244b.appspot.com",
  "tolee2-d244b.firebasestorage.app",
  "tolee2-d244b",
  "tolee2-d244b.firebaseapp.com"
];

async function testBuckets() {
  const app = initializeApp(firebaseConfig);
  
  for (const bucket of buckets) {
    console.log(`Testing bucket: ${bucket}...`);
    try {
      const storage = getStorage(app, `gs://${bucket}`);
      const storageRef = ref(storage, 'test-connection.txt');
      await uploadBytes(storageRef, Buffer.from('test'));
      console.log(`✅ SUCCESS with bucket: ${bucket}`);
      return;
    } catch (error) {
      console.log(`❌ FAILED with bucket: ${bucket} - ${error.message} (status: ${error.status_})`);
    }
  }
}

testBuckets();
