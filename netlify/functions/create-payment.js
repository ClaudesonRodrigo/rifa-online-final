// netlify/functions/create-payment.js

import { MercadoPagoConfig, Preference } from 'mercadopago';

exports.handler = async function(event) {
  const { items, payerData } = JSON.parse(event.body);

  if (!items || items.length === 0 || !payerData || !payerData.raffleId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Dados da compra inválidos ou ID da rifa em falta." }),
    };
  }

  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
  });
  const preference = new Preference(client);

  const siteUrl = process.env.URL || 'http://localhost:8888';

  try {
    const result = await preference.create({
      body: {
        items: items,
        payer: {
          name: payerData.name,
          email: payerData.email,
        },
        back_urls: {
          success: `${siteUrl}/rifa.html?id=${payerData.raffleId}&status=approved`,
          failure: `${siteUrl}/rifa.html?id=${payerData.raffleId}&status=failure`,
          pending: `${siteUrl}/rifa.html?id=${payerData.raffleId}&status=pending`,
        },
        auto_return: "approved",
        metadata: {
            selected_numbers: items.map(item => item.id),
            raffle_id: payerData.raffleId,
            user_id: payerData.userId,
            user_name: payerData.name,
            user_email: payerData.email,
            user_whatsapp: payerData.whatsapp,
            user_pix: payerData.pix,
            // ✅ ALTERAÇÃO AQUI: Adicionamos o ID do vendedor aos metadados
            vendor_id: payerData.vendorId || null 
        },
        notification_url: `${siteUrl}/.netlify/functions/payment-webhook`,
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl: result.init_point }),
    };

  } catch (error) {
    console.error("Erro ao criar preferência no Mercado Pago:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha ao comunicar com o Mercado Pago." }),
    };
  }
};
