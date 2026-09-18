const apiKey = "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";

async function testEndpoint(name, url, payload) {
  try {
    console.log(`\nTesting ${name}...`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.slice(0, 500)}`);
  } catch (err) {
    console.error(`Error on ${name}:`, err);
  }
}

async function run() {
  // 1. Stable Video Diffusion (needs an image, we pass a tiny 1x1 black pixel base64 as placeholder)
  const tinyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  await testEndpoint(
    "Stable Video Diffusion",
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-video-diffusion",
    {
      image: tinyImageBase64,
      seed: 42,
      cfg_scale: 2.5,
      motion_bucket_id: 127
    }
  );

  // 2. Cosmos Predict (text-to-video or text-to-world)
  await testEndpoint(
    "Cosmos Predict 1.0 (7B Diffusion Text2World)",
    "https://ai.api.nvidia.com/v1/genai/nvidia/cosmos-1.0-7b-diffusion-text2world",
    {
      prompt: "A puppy running in park",
      seed: 42
    }
  );

  // 3. Cosmos Predict General
  await testEndpoint(
    "Cosmos Predict WFM",
    "https://ai.api.nvidia.com/v1/genai/nvidia/cosmos-predict",
    {
      prompt: "A puppy running in park",
      seed: 42
    }
  );
}

run();
