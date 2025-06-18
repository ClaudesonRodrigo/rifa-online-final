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

    // ** LÓGICA DE CORREÇÃO MAIS ROBUSTA **
    // Se o pedido não for para o WhatsApp, extraímos apenas o JSON da resposta.
    if (!theme.includes("WhatsApp")) {
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        // Extrai apenas a string JSON, limpando qualquer texto ou markdown extra.
        text = text.substring(startIndex, endIndex + 1);
      } else {
        // Se não encontrar um JSON, lança um erro para depuração.
        throw new Error("A resposta da IA para o Oráculo não continha um JSON válido.");
      }
    }

    return {
      statusCode: 200,
      body: text, // Enviamos o JSON limpo ou a mensagem de texto pura.
    };

  } catch (error) {
    console.error("Erro na Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha ao comunicar com o Oráculo da Sorte." }),
    };
  }
};
