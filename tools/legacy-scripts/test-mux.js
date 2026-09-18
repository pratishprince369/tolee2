const Mux = require('@mux/mux-node');

try {
  console.log("Attempting to initialize Mux with empty/invalid strings...");
  const mux = new Mux({
    tokenId: '',
    tokenSecret: ''
  });
  console.log("Mux initialized successfully with empty strings!");
} catch (e) {
  console.error("Mux constructor threw an error with empty strings:", e.message);
}

try {
  console.log("Attempting to initialize Mux with undefined...");
  const mux = new Mux({
    tokenId: undefined,
    tokenSecret: undefined
  });
  console.log("Mux initialized successfully with undefined!");
} catch (e) {
  console.error("Mux constructor threw an error with undefined:", e.message);
}
