const { GoogleGenerativeAI } = require("@google/generative-ai");

// A chave da API é pega de forma segura das "Variáveis de Ambiente" da Netlify.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 'handler' é o nome padrão que a Netlify procura para executar.
exports.handler = async function(event) {
  try {
    const { theme } = JSON.parse(event.body);

    if (!theme) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "O tema é obrigatório." }),
      };
    }

    // Usamos um prompt um pouco mais flexível agora
    const prompt = theme.includes("WhatsApp") 
        ? theme // Se o prompt já for o de gerar mensagem, usa ele direto
        : `Você é um vidente místico e divertido. Baseado na palavra ou tema "${theme}", sugira 3 números de dois dígitos (de 00 a 99) para uma rifa. Para cada número, dê uma explicação curta, criativa e mística. Responda APENAS com um objeto JSON válido no formato: { "sugestoes": [ { "numero": "XX", "explicacao": "Sua explicação." } ] }`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      body: text,
    };

  } catch (error) {
    console.error("Erro na Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha ao comunicar com o Oráculo da Sorte." }),
    };
  }
};
