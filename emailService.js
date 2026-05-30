require('dotenv').config();
const nodemailer = require('nodemailer');

// Configuración del transportador
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Tu correo personal
        pass: process.env.EMAIL_PASS  // El código de 16 caracteres que creaste
    }
});

// Función para enviar el correo
async function enviarCorreo(destinatario, asunto, texto) {
    try {
        const info = await transporter.sendMail({
            from: `"Platuto" <${process.env.EMAIL_USER}>`,
            to: destinatario,
            subject: asunto,
            text: texto,
        });
        console.log("Correo enviado con éxito: " + info.messageId);
    } catch (error) {
        console.error("Error al enviar el correo:", error);
    }
}

module.exports = { enviarCorreo };