import { MercadoPagoConfig, Preference } from 'mercadopago';

exports.handler = async function(event) {
  const { items, payerData } = JSON.parse(event.body);

  if (!items || items.length === 0 || !payerData) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Dados da compra inválidos." }),
    };
  }

  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
  });
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: items,
        payer: {
          name: payerData.name,
          email: payerData.email,
        },
        back_urls: {
          success: "https://wonderful-fudge-37038e.netlify.app/rifa.html?id=" + payerData.raffleId,
          failure: "https://wonderful-fudge-37038e.netlify.app/rifa.html?id=" + payerData.raffleId,
          pending: "https://wonderful-fudge-37038e.netlify.app/rifa.html?id=" + payerData.raffleId,
        },
        auto_return: "approved",
        // **LÓGICA CORRIGIDA**: Passamos todos os dados de forma explícita e "plana"
        // para garantir que nada se perca na comunicação com o Mercado Pago.
        metadata: {
            selected_numbers: items.map(item => item.id),
            raffle_id: payerData.raffleId,
            user_id: payerData.userId,
            user_name: payerData.name,
            user_email: payerData.email,
            user_whatsapp: payerData.whatsapp,
            user_pix: payerData.pix
        },
        notification_url: `https://wonderful-fudge-37038e.netlify.app/.netlify/functions/payment-webhook`,
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
