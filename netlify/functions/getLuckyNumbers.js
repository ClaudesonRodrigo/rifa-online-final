// Este ficheiro não existe atualmente no seu projeto, deve criá-lo.
// O seu propósito é lidar com as chamadas para a API do Gemini de forma segura.

// A importação pode variar dependendo da versão do SDK do Google
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Handler da Função ---
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
    const { theme } = JSON.parse(event.body);

    if (!theme) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "O tema é obrigatório." }),
      };
    }
    
    // 3. Preparação e chamada da IA
    const prompt = `Você é um vidente místico e divertido. Baseado na palavra ou tema "${theme}", sugira 3 números de dois dígitos (de 00 a 99) para uma rifa. Para cada número, dê uma explicação curta, criativa e mística. Responda APENAS com um objeto JSON válido no formato: { "sugestoes": [ { "numero": "XX", "explicacao": "A sua explicação." } ] }`;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // 4. Limpeza e extração do JSON para evitar erros
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      text = text.substring(startIndex, endIndex + 1);
    } else {
      throw new Error("A resposta da IA não continha um JSON válido.");
    }
    
    // 5. Retorno com sucesso
    return {
      statusCode: 200,
      body: text,
    };

  } catch (error) {
    console.error("Erro DENTRO da Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Falha ao comunicar com o Oráculo da Sorte. Detalhes: ${error.message}` }),
    };
  }
};
