const apiKey = "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";

async function run() {
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    const data = await res.json();
    if (data.data) {
      const ids = data.data.map(m => m.id).sort();
      for (let i = 0; i < ids.length; i += 20) {
        console.log(`Slice ${i}-${i+20}:`, ids.slice(i, i+20));
      }
    } else {
      console.log("Integrate API Response:", data);
    }
  } catch (err) {
    console.error("Integrate API Error:", err);
  }
}

run();
