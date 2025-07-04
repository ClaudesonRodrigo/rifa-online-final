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
    // NOVO: Extrair 'raffleType' do corpo da requisição
    const { theme, raffleType } = JSON.parse(event.body);

    if (!theme) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "O tema é obrigatório." }),
      };
    }

    let numDigits;
    let maxNumber;
    let typeDescription;

    // NOVO: Definir o número de dígitos e o range máximo com base no raffleType
    switch (raffleType) {
        case 'centena':
            numDigits = 3;
            maxNumber = 999;
            typeDescription = "três dígitos (de 000 a 999)";
            break;
        case 'milhar':
            numDigits = 4;
            maxNumber = 9999;
            typeDescription = "quatro dígitos (de 0000 a 9999)";
            break;
        case 'dezena': // Default, caso não seja passado ou seja 'dezena'
        default:
            numDigits = 2;
            maxNumber = 99;
            typeDescription = "dois dígitos (de 00 a 99)";
            break;
    }
    
    // 3. Preparação e chamada da IA - PROMPT DINÂMICO
    // O prompt agora inclui o número de dígitos e o range máximo
    const prompt = `Você é um vidente místico e divertido. Baseado na palavra ou tema "${theme}", sugira 3 números de ${typeDescription} para uma rifa. Para cada número, dê uma explicação curta, criativa e mística. Certifique-se de que cada número esteja formatado com zeros à esquerda para ter exatamente ${numDigits} dígitos. Responda APENAS com um objeto JSON válido no formato: { "sugestoes": [ { "numero": "XX", "explicacao": "A sua explicação." } ] }`;
    
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

    // NOVO: Parsear o JSON e validar/formatar os números retornados pela IA
    const jsonResponse = JSON.parse(text);
    const validatedSuggestions = jsonResponse.sugestoes.map(sug => {
        let parsedNumber = parseInt(sug.numero, 10);
        
        // Garante que o número está dentro do range e formata
        if (isNaN(parsedNumber) || parsedNumber < 0 || parsedNumber > maxNumber) {
            // Se a IA retornar um número inválido, geramos um aleatório no range
            console.warn(`IA retornou número inválido (${sug.numero}). Gerando aleatório.`);
            parsedNumber = Math.floor(Math.random() * (maxNumber + 1));
        }
        
        // Re-formata o número para garantir o padLength
        const formattedNumber = String(parsedNumber).padStart(numDigits, '0');
        
        return {
            numero: formattedNumber,
            explicacao: sug.explicacao
        };
    });
    
    // Retorna as sugestões validadas e formatadas
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" }, // Garante o Content-Type correto
      body: JSON.stringify({ sugestoes: validatedSuggestions }),
    };

  } catch (error) {
    console.error("Erro DENTRO da Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Falha ao comunicar com o Oráculo da Sorte. Detalhes: ${error.message}` }),
    };
  }
};
