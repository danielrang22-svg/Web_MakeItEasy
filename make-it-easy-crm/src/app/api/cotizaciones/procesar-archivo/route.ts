import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import OpenAI, { toFile } from "openai";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const notasContexto = formData.get("notasContexto") as string;
    const correcciones = formData.get("correcciones") as string;
    const briefAnterior = formData.get("briefAnterior") as string;

    if (!files?.length && !notasContexto && !correcciones) {
      return NextResponse.json({ error: "Faltan datos (archivos, notas o correcciones)." }, { status: 400 });
    }

    // Obtener API Key de OpenAI
    const aiConn = await prisma.aiConnection.findFirst({
      where: { proveedor: "openai" }
    });

    if (!aiConn?.apiKey) {
      return NextResponse.json({ error: "No hay una API Key de OpenAI configurada." }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: aiConn.apiKey });

    // FLUJO 2: Corrección de un Brief existente
    if (correcciones && briefAnterior) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Eres un analista de requerimientos. A continuación recibirás un Brief de Negocio que ya fue redactado y unas correcciones que solicita el comercial. Reescribe el Brief incorporando las correcciones indicadas. Mantén un formato estructurado y profesional."
          },
          {
            role: "user",
            content: `--- BRIEF ACTUAL ---\n${briefAnterior}\n\n--- CORRECCIONES SOLICITADAS ---\n${correcciones}`
          }
        ],
        temperature: 0.7,
      });
      return NextResponse.json({ text: completion.choices[0].message.content });
    }

    // FLUJO 1: Creación de Brief desde Cero (Archivos + Notas)
    let rawText = notasContexto ? `\n--- NOTAS ADICIONALES DEL COMERCIAL ---\n${notasContexto}\n` : "";
    const imageParts: { type: "image_url", image_url: { url: string } }[] = [];

    for (const file of files) {
      const mimeType = file.type || "";
      const name = file.name.toLowerCase();
      
      const isAudio = mimeType.startsWith("audio/") || mimeType === "video/mp4" || !!name.match(/\.(m4a|mp3|wav|ogg|opus|oga|weba|caf|mp4)$/);
      const isPdf = mimeType === "application/pdf" || name.endsWith(".pdf");
      const isText = mimeType.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md");
      const isWord = name.endsWith(".docx");
      const isExcel = name.endsWith(".xlsx") || name.endsWith(".csv");
      const isImage = mimeType.startsWith("image/") || !!name.match(/\.(jpg|jpeg|png|webp)$/);

      rawText += `\n\n--- Archivo: ${file.name} ---\n`;

      if (isAudio) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          // Convert to a compatible name for Whisper (.opus/.oga to .ogg, .caf to .wav)
          let extension = "";
          if (name.includes('.')) {
            extension = name.split('.').pop() || "";
          }
          if (!extension) {
            if (mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("x-m4a")) {
              extension = "m4a";
            } else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
              extension = "mp3";
            } else if (mimeType.includes("wav")) {
              extension = "wav";
            } else if (mimeType.includes("ogg") || mimeType.includes("opus")) {
              extension = "ogg";
            } else if (mimeType.includes("caf")) {
              extension = "caf";
            } else {
              extension = "m4a"; // Fallback default for mobile voice notes
            }
          }
          
          const safeExtension = ['opus', 'oga', 'weba', 'caf'].includes(extension as string) 
            ? (extension === 'caf' ? 'wav' : 'ogg') 
            : (extension || 'm4a');
          const safeName = `audio.${safeExtension}`;

          const audioFile = await toFile(buffer, safeName, { type: file.type || "audio/ogg" });
          const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "es",
          });
          rawText += transcription.text;
        } catch (e) {
          console.error("Error transcribiendo audio:", e);
          rawText += "\n[Error al transcribir archivo de audio]\n";
        }
      } else if (isPdf) {
        const pdfParseModule = require("pdf-parse");
        const buffer = Buffer.from(await file.arrayBuffer());
        let pdfText = "";
        if (typeof pdfParseModule === 'function') {
          const pdfData = await pdfParseModule(buffer);
          pdfText = pdfData.text;
        } else if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
          const parser = new pdfParseModule.PDFParse({ data: buffer });
          const res = await parser.getText();
          pdfText = res.text;
        } else {
          throw new Error("No se pudo cargar un parser de PDF compatible (pdf-parse).");
        }
        rawText += pdfText;
      } else if (isText) {
        const buffer = Buffer.from(await file.arrayBuffer());
        rawText += buffer.toString("utf-8");
      } else if (isWord) {
        try {
          const mammoth = require("mammoth");
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await mammoth.extractRawText({ buffer });
          rawText += result.value;
        } catch (e) {
          rawText += "[Error al procesar archivo Word]";
        }
      } else if (isExcel) {
        try {
          const XLSX = require("xlsx");
          const buffer = Buffer.from(await file.arrayBuffer());
          const workbook = XLSX.read(buffer, { type: "buffer" });
          let excelText = "";
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            excelText += `Hoja: ${sheetName}\n` + XLSX.utils.sheet_to_csv(sheet) + "\n";
          }
          rawText += excelText;
        } catch (e) {
          rawText += "[Error al procesar archivo Excel]";
        }
      } else if (isImage) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const base64 = buffer.toString("base64");
          const imageMime = mimeType || "image/jpeg";
          imageParts.push({
            type: "image_url",
            image_url: { url: `data:${imageMime};base64,${base64}` }
          });
          rawText += "[Imagen adjunta y enviada a la IA visualmente]";
        } catch (e) {
          rawText += "[Error al procesar imagen]";
        }
      } else {
        rawText += "[Formato de archivo no soportado o desconocido]";
      }
    }

    // Generar el brief a partir del texto en crudo
    const userMessageContent: any[] = [{ type: "text", text: rawText }];
    if (imageParts.length > 0) {
      userMessageContent.push(...imageParts);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un analista de requerimientos. A continuación recibirás la transcripción cruda de audios, documentos o notas adicionales de un cliente (y posiblemente imágenes adjuntas). Tu tarea es analizar esa información y extraer un **Brief de Negocio estructurado y profesional** en español. Omite ruido o charla irrelevante. Extrae: Nombre del negocio (si se menciona), problema principal, requerimientos operativos, plataformas mencionadas, y presupuesto estimado (si existe). Sé conciso y directo.",
        },
        {
          role: "user",
          content: userMessageContent
        }
      ],
      temperature: 0.7,
    });

    const briefFinal = completion.choices[0].message.content || rawText;

    return NextResponse.json({ text: briefFinal });
  } catch (error: any) {
    console.error("Error procesando archivo:", error);
    return NextResponse.json({ error: error.message || "Error procesando los archivos" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
