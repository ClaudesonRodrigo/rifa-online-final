// netlify/functions/create-payment.js

const fetch = require('node-fetch');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { items, payerData } = JSON.parse(event.body);

        if (!items || items.length === 0 || !payerData || !payerData.cpf) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Dados da compra ou CPF do pagador estão faltando." }),
            };
        }

        const totalValue = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
        const description = `Pagamento para a rifa: ${payerData.raffleId}. Números: ${items.map(i => i.id).join(', ')}`;
        const externalReference = `RIFA_${payerData.raffleId}_${new Date().getTime()}`;

        // 1. Criar o cliente no Asaas
       const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
                name: payerData.name,
                email: payerData.email,
                cpfCnpj: payerData.cpf,
                externalReference: payerData.userId // Usando o ID do Firebase como referência externa do cliente
            })
        });

        const customerData = await customerResponse.json();
        // Se o cliente já existir pelo CPF, o Asaas retorna os dados dele, o que é ótimo.
        if (!customerResponse.ok && !customerData.errors.some(e => e.code === 'invalid_customer')) {
             console.error('Erro ao criar cliente Asaas:', customerData.errors);
             throw new Error('Falha ao registrar dados do cliente.');
        }
        const customerId = customerData.id;


        // 2. Criar a cobrança PIX
       const paymentResponse = await fetch('https://sandbox.asaas.com/api/v3/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': process.env.ASAAS_API_KEY
            },
            body: JSON.stringify({
                customer: customerId,
                billingType: 'PIX',
                dueDate: new Date().toISOString().split('T')[0],
                value: totalValue,
                description: description,
                externalReference: externalReference, // ID único da transação
                // Passando os dados para o webhook via metadata
                metadata: {
                    selected_numbers: items.map(item => item.id),
                    raffle_id: payerData.raffleId,
                    user_id: payerData.userId,
                    user_name: payerData.name,
                    user_email: payerData.email,
                    user_whatsapp: payerData.whatsapp,
                    user_pix: payerData.pix,
                    vendor_id: payerData.vendorId || null
                }
            })
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            console.error('Erro ao criar cobrança Asaas:', paymentData.errors);
            throw new Error(paymentData.errors[0].description);
        }

        // 3. Retornar os dados do PIX para o frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                paymentId: paymentData.id,
                qrCodePayload: paymentData.pixQrCode.payload,
                qrCodeImage: paymentData.pixQrCode.encodedImage,
                externalReference: paymentData.externalReference
            })
        };

    } catch (error) {
        console.error("Erro em create-payment (Asaas):", error);
        return { statusCode: 500, body: JSON.stringify({ error: `Falha ao gerar cobrança: ${error.message}` }) };
    }
};

