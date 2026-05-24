import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
      config: {
        systemInstruction: "You are a test assistant",
      }
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
test();
