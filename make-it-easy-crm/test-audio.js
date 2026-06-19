const { PrismaClient } = require("@prisma/client");
const { OpenAI, toFile } = require("openai");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function run() {
  try {
    console.log("Connecting to database...");
    const aiConn = await prisma.aiConnection.findFirst({
      where: { proveedor: "openai" }
    });

    if (!aiConn || !aiConn.apiKey) {
      console.error("OpenAI API connection key not found in database.");
      return;
    }

    console.log("OpenAI Connection found. API Key (masked):", aiConn.apiKey.substring(0, 10) + "...");
    const openai = new OpenAI({ apiKey: aiConn.apiKey });

    const filePath = "C:\\Users\\USUARIO\\Downloads\\AUDIO-2026-06-18-13-30-33.m4a.mp4";
    console.log("Reading file:", filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error("File does not exist!");
      return;
    }

    const stats = fs.statSync(filePath);
    console.log("File size:", stats.size, "bytes");

    const buffer = fs.readFileSync(filePath);
    
    console.log("Converting buffer using toFile...");
    const audioFile = await toFile(buffer, "audio.m4a", { type: "video/mp4" });
    
    console.log("Calling OpenAI Whisper...");
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "es",
    });

    console.log("SUCCESS! Transcription output:");
    console.log(transcription.text);
  } catch (error) {
    console.error("ERROR IN TRANSCRIPTION:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
