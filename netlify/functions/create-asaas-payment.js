// netlify/functions/create-asaas-payment.js

const axios = require('axios');

// Configura o Axios para se comunicar com a API da Asaas
const asaasAPI = axios.create({
    baseURL: 'https://api.asaas.com/v3',
    headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
    }
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { raffleId, selectedNumbers, participant } = JSON.parse(event.body);

        // Validação básica dos dados recebidos
        if (!raffleId || !selectedNumbers || !participant || !participant.name) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Dados da compra incompletos.' }) };
        }

        // --- ETAPA 1: Criar o Cliente na Asaas ---
        // (Ou buscar se já existir, mas para rifas, criar um novo é mais simples)
        const customerResponse = await asaasAPI.post('/customers', {
            name: participant.name,
            email: participant.email,
            mobilePhone: participant.whatsapp.replace(/\D/g, ''), // Remove caracteres não numéricos do WhatsApp
            cpfCnpj: participant.cpf // O frontend precisará enviar o CPF
        });
        const customerId = customerResponse.data.id;

        // --- ETAPA 2: Criar a Cobrança PIX para o Cliente ---
        const pricePerNumber = 10.50; // IMPORTANTE: Este valor deve vir do seu banco de dados no futuro
        const totalValue = selectedNumbers.length * pricePerNumber;

        // Adiciona 1 dia de validade para o PIX
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const formattedDueDate = dueDate.toISOString().split('T')[0];

        const paymentResponse = await asaasAPI.post('/payments', {
            customer: customerId,
            billingType: 'PIX',
            value: totalValue,
            dueDate: formattedDueDate,
            description: `Sorteio Sergipano - Rifa #${raffleId} - Números: ${selectedNumbers.join(', ')}`
        });

        const paymentData = paymentResponse.data;

        // Se a cobrança for criada e o PIX estiver disponível, retorna os dados para o frontend
        if (paymentData.status === 'PENDING' && paymentData.pixQrCodeUrl) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    paymentId: paymentData.id,
                    qrCodeImage: paymentData.pixQrCodeUrl,
                    payload: paymentData.pixPayload, // O código do "PIX Copia e Cola"
                    value: paymentData.value
                })
            };
        } else {
            throw new Error('Não foi possível gerar a cobrança PIX na Asaas.');
        }

    } catch (error) {
        console.error("Erro ao processar pagamento com Asaas:", error.response?.data || error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha na comunicação com o gateway de pagamento.' })
        };
    }
};
