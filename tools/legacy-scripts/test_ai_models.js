const apiKey = "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";

async function run() {
  try {
    const res = await fetch("https://ai.api.nvidia.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    const text = await res.text();
    console.log("AI API Response:", text);
  } catch (err) {
    console.error("AI API Error:", err);
  }
}

run();
