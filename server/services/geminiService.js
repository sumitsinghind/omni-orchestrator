import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";
import getAccessToken from "../utils/getAccessToken.js";

// --- Helper: Convert PCM audio buffer to WAV format ---
function pcmToWav(pcmData, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(fileSize + 8);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write("WAVE", 8);

  // FMT sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Sub-chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // DATA sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Copy PCM audio data
  pcmData.copy(buffer, 44);

  return buffer;
}

// --- Text Generation ---
export async function generateText(prompt) {
  try {
    const token = await getAccessToken();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("TEXT GENERATION API ERROR:", data);
      throw new Error(`API call failed with status: ${response.status}`);
    }

    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      if (data.candidates[0]?.finishReason === "SAFETY") {
        return "The response was blocked due to safety concerns.";
      }
      throw new Error("API returned no valid text content.");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("TEXT GENERATION ERROR:", error);
    throw new Error("Failed to generate text from Gemini.");
  }
}

// --- Image Generation ---
export async function generateImage(prompt) {
  try {
    const token = await getAccessToken();
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GCLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/imagegeneration:predict`;

    const body = { instances: [{ prompt }], parameters: { sampleCount: 1 } };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("IMAGE GENERATION API ERROR:", data);
      throw new Error(`API call failed with status: ${response.status}`);
    }

    if (!data.predictions || data.predictions.length === 0) {
      // This case often indicates a safety policy violation.
      throw new Error(
        "The image prompt was likely blocked for safety reasons. Please try a different prompt."
      );
    }

    return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
  } catch (error) {
    console.error("IMAGE GENERATION ERROR:", error);
    // Pass the specific error message from the try block, or a generic one.
    throw new Error(error.message || "Failed to generate image from Gemini.");
  }
}

// --- Audio Generation ---
export async function generateAudio(text) {
  try {
    const token = await getAccessToken();
    const url = "https://texttospeech.googleapis.com/v1/text:synthesize";

    const body = {
      input: { text },
      voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000 },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("AUDIO GENERATION API ERROR:", errorData);
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();
    const pcmData = Buffer.from(data.audioContent, "base64");
    const wavData = pcmToWav(pcmData, 24000);

    return `data:audio/wav;base64,${wavData.toString("base64")}`;
  } catch (error) {
    console.error("AUDIO GENERATION ERROR:", error);
    throw new Error("Failed to generate audio from Gemini.");
  }
}

// --- Video Generation Placeholder ---
export async function generateVideo(prompt) {
  console.log(`VIDEO GENERATION PLACEHOLDER for: "${prompt}"`);
  return "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
}
