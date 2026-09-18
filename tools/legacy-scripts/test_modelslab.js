const apiKey = "WNXe1uF02mmr0EPsu6bork9KKU0N7cQs5LSYEmDCB4k34GkbuAf6V8JmsvLy";

async function run() {
  try {
    const payload = {
      key: apiKey,
      prompt: "A cinematic shot of a happy puppy playing in the grass, 4k",
      width: 512,
      height: 512,
      video_length: 3,
      frames: 24
    };

    console.log("Sending request to ModelsLab...");
    const res = await fetch("https://modelslab.com/api/v6/video/text2video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("ModelsLab Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("ModelsLab Error:", err);
  }
}

run();
