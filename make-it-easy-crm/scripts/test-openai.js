const { PrismaClient } = require("@prisma/client");
const OpenAI = require("openai");

async function testOpenAI() {
  const prisma = new PrismaClient();
  try {
    const activeAgent = await prisma.agent.findFirst({
      where: { activo: true },
      include: { conexion: true }
    });

    const apiKey = activeAgent?.conexion?.apiKey;
    if (!apiKey) {
      console.log("No se encontró API Key en el agente activo.");
      return;
    }

    console.log(`Probando conexión a OpenAI con la clave (longitud: ${apiKey.length}):`);
    console.log(`Clave: "${apiKey}"`);

    const hasNonAscii = /[^\x00-\x7F]/.test(apiKey);
    const hasWhitespace = /\s/.test(apiKey);
    console.log(`- Contiene caracteres no ASCII: ${hasNonAscii}`);
    console.log(`- Contiene espacios/saltos de línea: ${hasWhitespace}`);

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "di hola" }],
      max_tokens: 5
    });

    console.log("Respuesta de OpenAI exitosa:", response.choices[0].message.content);

  } catch (err) {
    console.error("ERROR al conectar con OpenAI:", err.message);
    if (err.status) console.log("Status Code:", err.status);
  } finally {
    await prisma.$disconnect();
  }
}

testOpenAI();
