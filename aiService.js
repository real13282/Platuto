const axios = require("axios");

async function redactarCorreoSolicitud(datos) {
  const { licenciatura, semestre, materia, alumno, observacionAsesorado } = datos;
  const systemPrompt = `Eres Platuto, el asistente del sistema de tutorías. Tu tarea es redactar el cuerpo de un correo transaccional corto y profesional.
  REGLAS ESTRICTAS:
  1. Usa SOLO texto plano. Cero markdown, cero asteriscos, cero negritas.
  2. NUNCA inventes datos, nombres o lugares.
  3. NUNCA agregues frases de relleno ni te disculpes por falta de información.
  4. Despídete siempre exactamente con: "Saludos cordiales,\nEl equipo de Platuto".
  5. Recuerda siempre que la asesoría es a través del chat interno de la plataforma.`;

  const userPrompt = `Redacta el mensaje para notificar a un tutor sobre una nueva solicitud de asesoría. 
  Datos de la solicitud:
  - Licenciatura: ${licenciatura}
  - Semestre: ${semestre}
  - Materia: ${materia}
  - Alumno: ${alumno}
  - Mensaje del alumno: "${observacionAsesorado}"

  Instrucciones de redacción:
  - Inicia con "Estimado/a tutor/a,".
  - Avisa que el alumno ${alumno} (de ${semestre} semestre, Lic. en ${licenciatura}) solicitó una asesoría para la materia de ${materia}.
  - Para el tema, cita EXACTAMENTE el "Mensaje del alumno" entre comillas. No intentes resumirlo ni adaptarlo.
  - Menciona brevemente que la sesión se llevará a cabo a través del chat de la plataforma.
  - Cierra con la despedida indicada en tus reglas.`;

  try {
    const response = await axios.post('http://localhost:11434/v1/chat/completions', {
      model: 'qwen2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    });

    const textoGenerado = response.data.choices[0]?.message?.content;
    console.log("IA Solicitud Generada:\n", textoGenerado);

    if (!textoGenerado || textoGenerado.trim() === "") {
      throw new Error("El modelo retornó texto vacío.");
    }
    return textoGenerado.trim();
  } catch (error) {
    console.error("Error al redactar correo con IA:", error.message || error);
    return `Hola, tienes una nueva solicitud de asesoría de ${alumno} para la materia ${materia}.\nTemas: ${observacionAsesorado}`;
  }
}

async function redactarCorreoRespuesta(datos) {
  const { estado, materia, tutor, observacionTutor, observacionAsesorado } = datos;
  const systemPrompt = `Eres Platuto, el asistente del sistema de tutorías. Tu tarea es redactar el cuerpo de un correo transaccional dirigido a un estudiante.
  REGLAS ESTRICTAS:
  1. Usa SOLO texto plano. Cero markdown, cero asteriscos, cero negritas.
  2. NUNCA inventes datos, nombres o lugares.
  3. Despídete siempre exactamente con: "Saludos,\nEl equipo de Platuto".
  4. Recuerda que la plataforma funciona mediante chat en tiempo real.`;

  let userPrompt = "";

  if (estado === "Aceptada") {
    userPrompt = `Redacta un correo informando a un alumno que su solicitud de asesoría ha sido ACEPTADA.
  
Datos:
- Materia: ${materia}
- Tutor: ${tutor}
- Temas a revisar: "${observacionAsesorado || 'los temas propuestos'}"

Instrucciones de redacción:
- Inicia con un saludo amable y directo.
- Usa un tono entusiasta, alentador y profesional (sin exagerar con los signos de exclamación).
- Confirma que el tutor ha aceptado la solicitud y menciona explícitamente los "Temas a revisar".
- Recuérdale ingresar al chat de la plataforma para comenzar la asesoría con su tutor.
- Cierra con la despedida indicada en tus reglas.`;

  } else {
    userPrompt = `Redacta un correo informando a un alumno que su solicitud de asesoría ha sido RECHAZADA.
    
  Datos:
  - Materia: ${materia}
  - Tutor: ${tutor}
  - Motivo del tutor: "${observacionTutor || 'No se proporcionó un motivo específico'}"

  Instrucciones de redacción:
  - Inicia con un saludo amable.
  - Usa un tono comprensivo, empático y respetuoso. NO exageres ni suenes trágico.
  - Infórmale claramente que, en esta ocasión, el tutor no podrá impartir la asesoría.
  - Explica la razón citando EXACTAMENTE el "Motivo del tutor" entre comillas.
  - Motívalo a no desanimarse y a enviar una nueva solicitud a otro tutor dentro de la plataforma.
  - Cierra con la despedida indicada en tus reglas.`;
  }

  try {
    const response = await axios.post('http://localhost:11434/v1/chat/completions', {
      model: 'qwen2.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    });

    const textoGenerado = response.data.choices[0]?.message?.content;
    console.log("IA Respuesta Generada:\n", textoGenerado);

    if (!textoGenerado || textoGenerado.trim() === "") {
      throw new Error("El modelo retornó texto vacío.");
    }
    return textoGenerado.trim();
  } catch (error) {
    console.error("Error al redactar correo con IA:", error.message || error);
    return `Hola, tu solicitud de asesoría para la materia ${materia} ha sido ${estado} por el tutor ${tutor}.\n\nObservación del tutor: ${observacionTutor || 'Ninguna'}`;
  }
}

module.exports = { redactarCorreoSolicitud, redactarCorreoRespuesta };
