// netlify/functions/create-payment.js (com debug)

import { MercadoPagoConfig, Preference } from 'mercadopago';

exports.handler = async function(event) {
  const { items, payerData } = JSON.parse(event.body);
  
  // LOG DE DEBUG 1:
  console.log("--- Início: create-payment ---");
  console.log("Dados recebidos do frontend (payerData):", payerData);

  if (!items || items.length === 0 || !payerData || !payerData.raffleId) {
    console.error("Erro: Dados da compra inválidos ou ID da rifa em falta.");
    return { statusCode: 400, body: JSON.stringify({ error: "Dados inválidos." }) };
  }

  const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
  const preference = new Preference(client);
  const siteUrl = process.env.URL || 'http://localhost:8888';

  try {
    const metadata = {
        selected_numbers: items.map(item => item.id),
        raffle_id: payerData.raffleId,
        user_id: payerData.userId,
        user_name: payerData.name,
        user_email: payerData.email,
        user_whatsapp: payerData.whatsapp,
        user_pix: payerData.pix,
        vendor_id: payerData.vendorId || null 
    };

    // LOG DE DEBUG 2:
    console.log("Metadata que será enviado para o Mercado Pago:", metadata);

    const result = await preference.create({
      body: {
        items,
        payer: { name: payerData.name, email: payerData.email },
        back_urls: {
          success: `${siteUrl}/rifa.html?id=${payerData.raffleId}&status=approved`,
          failure: `${siteUrl}/rifa.html?id=${payerData.raffleId}&status=failure`,
          pending: `${siteUrl}/rifa.html?id=${payerData.raffleId}&status=pending`,
        },
        auto_return: "approved",
        metadata: metadata,
        notification_url: `${siteUrl}/.netlify/functions/payment-webhook`,
      }
    });
    
    console.log("Preferência de pagamento criada com sucesso no Mercado Pago.");
    return { statusCode: 200, body: JSON.stringify({ checkoutUrl: result.init_point }) };

  } catch (error) {
    console.error("Erro em create-payment:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Falha ao comunicar com o Mercado Pago." }) };
  }
};
