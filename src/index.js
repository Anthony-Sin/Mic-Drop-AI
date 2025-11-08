export default {
  async fetch(request, env) {
    const apiKey = env.GEMINI_API_KEY;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Describe Jetson Orin Nano" }] }]
      })
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
