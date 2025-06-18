const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async function(event) {
  try {
    const { theme } = JSON.parse(event.body);

    if (!theme) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "O tema é obrigatório." }),
      };
    }

    const prompt = theme.includes("WhatsApp") 
        ? theme
        : `Você é um vidente místico e divertido. Baseado na palavra ou tema "${theme}", sugira 3 números de dois dígitos (de 00 a 99) para uma rifa. Para cada número, dê uma explicação curta, criativa e mística. Responda APENAS com um objeto JSON válido no formato: { "sugestoes": [ { "numero": "XX", "explicacao": "Sua explicação." } ] }`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // ** LÓGICA DE CORREÇÃO ADICIONADA AQUI **
    // Remove o "embrulho" de Markdown que a IA às vezes adiciona.
    if (text.startsWith("```json")) {
      text = text.substring(7, text.length - 3);
    } else if (text.startsWith("```")) {
       text = text.substring(3, text.length - 3);
    }
    
    // Remove espaços em branco desnecessários antes de enviar.
    text = text.trim();

    return {
      statusCode: 200,
      body: text, // Agora enviamos o JSON limpo.
    };

  } catch (error) {
    console.error("Erro na Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha ao comunicar com o Oráculo da Sorte." }),
    };
  }
};
