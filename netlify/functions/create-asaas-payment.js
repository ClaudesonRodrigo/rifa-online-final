// netlify/functions/create-asaas-payment.js - VERSÃO ATUALIZADA

const axios = require('axios');

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

        if (!raffleId || !selectedNumbers || !participant || !participant.name || !participant.cpf) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Dados da compra incompletos.' }) };
        }

        const customerResponse = await asaasAPI.post('/customers', {
            name: participant.name,
            email: participant.email,
            mobilePhone: participant.whatsapp.replace(/\D/g, ''),
            cpfCnpj: participant.cpf.replace(/\D/g, '')
        });
        const customerId = customerResponse.data.id;

        const pricePerNumber = 10.50; // Idealmente, buscar este valor do DB
        const totalValue = selectedNumbers.length * pricePerNumber;
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        const formattedDueDate = dueDate.toISOString().split('T')[0];

        const paymentResponse = await asaasAPI.post('/payments', {
            customer: customerId,
            billingType: 'PIX',
            value: totalValue,
            dueDate: formattedDueDate,
            description: `Sorteio Sergipano - Rifa #${raffleId} - Números: ${selectedNumbers.join(', ')}`,
            // ✅ "ETIQUETA" ADICIONADA AQUI ✅
            externalReference: JSON.stringify({ 
                raffleId: raffleId,
                selectedNumbers: selectedNumbers,
                payerData: { ...participant }
            })
        });

        const paymentData = paymentResponse.data;

        if (paymentData.status === 'PENDING' && paymentData.pixQrCodeUrl) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    paymentId: paymentData.id,
                    qrCodeImage: paymentData.pixQrCodeUrl,
                    payload: paymentData.pixPayload,
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
