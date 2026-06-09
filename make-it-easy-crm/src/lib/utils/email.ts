import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.log("-----------------------------------------");
      console.log("Mock Email (SMTP no configurado):");
      console.log(`Para: ${to}`);
      console.log(`Asunto: ${subject}`);
      console.log(`Cuerpo: ${html}`);
      console.log("-----------------------------------------");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Make It Easy" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Correo enviado:", info.messageId);
  } catch (error) {
    console.error("Error al enviar correo:", error);
  }
}
