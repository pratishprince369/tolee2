async function run() {
  try {
    const prompt = encodeURIComponent("A futuristic city at night, cyber punk style, high quality");
    const url = `https://gen.pollinations.ai/video/${prompt}`;
    console.log("Testing Pollinations AI video URL:", url);
    const res = await fetch(url);
    console.log("Status:", res.status);
    const contentType = res.headers.get("content-type");
    console.log("Content Type:", contentType);
    if (contentType.includes("json")) {
      const data = await res.json();
      console.log("Response JSON:", data);
    } else {
      console.log("Response text/stream received successfully!");
    }
  } catch (err) {
    console.error("Pollinations AI Error:", err);
  }
}

run();
