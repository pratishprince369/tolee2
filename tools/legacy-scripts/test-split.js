const mediaUrls = "https://res.cloudinary.com/drbeq3h8m/image/upload/q_auto,f_auto/v1780004993/tolee_uploads/uaf3ki8mraw5eym7oiij.jpg,https://res.cloudinary.com/drbeq3h8m/image/upload/q_auto,f_auto/v1780004994/tolee_uploads/gp7qbxyyrejj8nldv2de.jpg";
const mediaTypes = "image,image";

const urls = mediaUrls ? mediaUrls.split(/,(?=https?:\/\/)/).map(url => url.trim()).filter(Boolean) : [];
const rawTypes = mediaTypes ? mediaTypes.split(',').map(t => t.trim().toLowerCase()) : [];

const items = urls.map((url, idx) => ({
  url,
  type: rawTypes[idx] || (url.includes('.mp4') || url.includes('video') ? 'video' : 'image')
}));

console.log("URLs length:", urls.length);
console.log("URLs:", urls);
console.log("Items length:", items.length);
console.log("Items:", items);
