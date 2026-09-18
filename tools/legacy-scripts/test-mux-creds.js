const Mux = require('@mux/mux-node');
require('dotenv').config({ path: '../apps/web/.env' });

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID || '0f358a94-4bdf-403e-bb8a-02ee17b68b66';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET || 'GiZ6iyNUthNh1Kt1BEYph8zVv24R4CINmTl64k7l0lyRzdvehcZlHCcndb0Gcn8KdsVnv5n3XBc';

console.log("Using MUX_TOKEN_ID:", MUX_TOKEN_ID);
console.log("Using MUX_TOKEN_SECRET (first 5 chars):", MUX_TOKEN_SECRET.substring(0, 5) + "...");

const mux = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET,
});

async function test() {
  try {
    console.log("Listing assets...");
    const assets = await mux.video.assets.list({ limit: 1 });
    console.log("Success! Assets count retrieved:", assets.data.length);
  } catch (error) {
    console.error("Mux API Call Failed:", error);
  }
}

test();
