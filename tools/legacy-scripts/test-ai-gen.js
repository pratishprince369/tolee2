const http = require('http');

const postData = JSON.stringify({
  prompt: 'Luxury modern kitchen design with warm sunset light and plants',
  style: 'realistic',
  aspectRatio: 'square',
  count: 2
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-image',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending test POST request to http://localhost:3000/api/generate-image ...');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response Status Code: ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('Parsed Response JSON:', JSON.stringify(json, null, 2));
      if (json.success && json.urls && json.urls.length > 0) {
        console.log('\nSUCCESS! Generated AI URLs:');
        json.urls.forEach((url, i) => console.log(`[Variant ${i+1}]: ${url}`));
        
        // Now let's try to test the saving endpoint with the first URL
        testSaveImage(json.urls[0]);
      } else {
        console.error('FAILED: Invalid response structure.');
      }
    } catch (err) {
      console.error('Error parsing JSON response:', err.message);
      console.log('Raw data received:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();

function testSaveImage(url) {
  const saveData = JSON.stringify({ imageUrl: url });
  
  const saveOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/save-generated-image',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(saveData)
    }
  };
  
  console.log('\n----------------------------------------');
  console.log('Testing Cloudinary upload endpoint /api/save-generated-image ...');
  
  const saveReq = http.request(saveOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`Cloudinary Upload Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        console.log('Cloudinary Response JSON:', JSON.stringify(json, null, 2));
        if (json.success && json.url) {
          console.log('\nSUCCESS! Cloudinary Secure URL:', json.url);
        } else {
          console.error('FAILED to save image to Cloudinary.');
        }
      } catch (err) {
        console.error('Error parsing Cloudinary JSON response:', err.message);
      }
    });
  });
  
  saveReq.on('error', (e) => {
    console.error(`Problem with Cloudinary request: ${e.message}`);
  });
  
  saveReq.write(saveData);
  saveReq.end();
}
