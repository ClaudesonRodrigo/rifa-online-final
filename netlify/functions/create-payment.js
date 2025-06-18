const { MercadoPagoConfig, Preference } = require('mercadopago');

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
          success: "https://wonderful-fudge-37038e.netlify.app/",
          failure: "https://wonderful-fudge-37038e.netlify.app/",
          pending: "https://wonderful-fudge-37038e.netlify.app/",
        },
        auto_return: "approved",
        metadata: {
            user_id: payerData.userId,
            user_data: payerData,
            selected_numbers: items.map(item => item.id)
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
