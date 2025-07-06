// netlify/functions/getLuckyNumbers.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event) {
  // 1. Verificação de segurança da API Key
  if (!process.env.GEMINI_API_KEY) {
    console.error("ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não está configurada na Netlify.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "A chave da API do Oráculo não está configurada no servidor." }),
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    // ✅ CORREÇÃO 1: Lemos o 'raffleType' vindo do site
    const { theme, raffleType } = JSON.parse(event.body);

    if (!theme) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "O tema é obrigatório." }),
      };
    }
    
    // ✅ CORREÇÃO 2: Criamos o texto dinâmico para o prompt
    const raffleDetails = {
      dezena: { text: "dois dígitos (de 00 a 99)", example: "XX" },
      centena: { text: "três dígitos (de 000 a 999)", example: "XXX" },
      milhar: { text: "quatro dígitos (de 0000 a 9999)", example: "XXXX" }
    };
    const details = raffleDetails[raffleType] || raffleDetails.dezena; // Padrão é dezena

    // ✅ CORREÇÃO 3: Usamos o texto dinâmico no prompt
    const prompt = `Você é um vidente místico e divertido. Baseado no tema "${theme}", sugira 3 números de ${details.text} para uma rifa. Para cada número, dê uma explicação curta e criativa. Responda APENAS com um objeto JSON válido no formato: { "sugestoes": [ { "numero": "${details.example}", "explicacao": "Sua explicação mística." } ] }`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Limpeza do JSON
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      text = text.substring(startIndex, endIndex + 1);
    } else {
      throw new Error("A resposta da IA não continha um JSON válido.");
    }
    
    return {
      statusCode: 200,
      body: text,
    };

  } catch (error) {
    console.error("Erro DENTRO da Netlify Function (getLuckyNumbers):", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Falha ao comunicar com o Oráculo da Sorte. Detalhes: ${error.message}` }),
    };
  }
};
