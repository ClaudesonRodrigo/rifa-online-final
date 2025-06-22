import { MercadoPagoConfig, Preference } from 'mercadopago';

// O handler da função, que a Netlify irá executar
exports.handler = async function(event) {
  // Pega os dados enviados pelo site (frontend)
  const { items, payerData } = JSON.parse(event.body);

  // Validação básica
  if (!items || items.length === 0 || !payerData || !payerData.raffleId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Dados da compra inválidos ou ID da rifa em falta." }),
    };
  }

  // Configura o cliente do Mercado Pago com sua chave secreta
  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
  });
  const preference = new Preference(client);

  try {
    // Cria a "preferência de pagamento"
    const result = await preference.create({
      body: {
        items: items,
        payer: {
          name: payerData.name,
          email: payerData.email,
        },
        back_urls: {
          // URLs para onde o utilizador será redirecionado após o pagamento
          success: `https://wonderful-fudge-37038e.netlify.app/rifa.html?id=${payerData.raffleId}`,
          failure: `https://wonderful-fudge-37038e.netlify.app/rifa.html?id=${payerData.raffleId}`,
          pending: `https://wonderful-fudge-37038e.netlify.app/rifa.html?id=${payerData.raffleId}`,
        },
        auto_return: "approved", // Retorna automaticamente para o site após aprovação
        // Dados personalizados que serão devolvidos na confirmação do pagamento
        metadata: {
            selected_numbers: items.map(item => item.id),
            raffle_id: payerData.raffleId,
            user_id: payerData.userId,
            user_name: payerData.name,
            user_email: payerData.email,
            user_whatsapp: payerData.whatsapp,
            user_pix: payerData.pix
        },
        notification_url: `https://wonderful-fudge-37038e.netlify.app/.netlify/functions/payment-webhook`, // URL que o Mercado Pago avisará sobre o status do pagamento
      }
    });

    // Retorna o link de checkout para o site
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
