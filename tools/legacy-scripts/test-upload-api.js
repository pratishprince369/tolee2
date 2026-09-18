const fs = require('fs');
const path = require('path');

async function testUpload() {
  console.log("Testing Firebase Upload via API route...");
  
  // Create a dummy file
  const filePath = path.join(__dirname, 'test-image.jpg');
  fs.writeFileSync(filePath, 'dummy content');

  const formData = new FormData();
  const file = new File(['dummy content'], 'test-image.jpg', { type: 'image/jpeg' });
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log("SUCCESS: Upload works! URL:", data.url);
    } else {
      console.log("FAILED: Upload failed.", data.error, data.details);
    }
  } catch (error) {
    console.error("Error connecting to dev server:", error.message);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

testUpload();
