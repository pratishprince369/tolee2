const https = require('https');

const id = '1JqfhcvqmkH4EB0JNzmy0i6BmBQXRg3Hh';
const url = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

console.log('Testing URL:', url);
const req = https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Range': 'bytes=0-1000'
  }
}, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Range:', res.headers['content-range']);
  console.log('Content-Length:', res.headers['content-length']);
  console.log('Accept-Ranges:', res.headers['accept-ranges']);
  res.destroy();
});

req.on('error', (e) => console.error('Error:', e.message));
