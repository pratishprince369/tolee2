const https = require('https');

const url = "https://res.cloudinary.com/drbeq3h8m/image/upload/q_auto,f_auto/v1780004993/tolee_uploads/uaf3ki8mraw5eym7oiij.jpg";

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
