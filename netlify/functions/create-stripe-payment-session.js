// netlify/functions/create-stripe-payment-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  const { items, raffleId, payerData } = JSON.parse(event.body);
  const siteUrl = process.env.URL || 'http://localhost:8888';

  const lineItems = items.map(item => ({
    price_data: {
      currency: 'brl',
      product_data: {
        name: item.title,
      },
      unit_amount: item.unit_price * 100, // Stripe usa centavos
    },
    quantity: item.quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto', 'pix'],
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        raffle_id: raffleId,
        selected_numbers: JSON.stringify(items.map(item => item.id)),
        user_id: payerData.userId,
        user_name: payerData.name,
        user_email: payerData.email,
        user_whatsapp: payerData.whatsapp,
        user_pix: payerData.pix,
        vendor_id: payerData.vendorId || ''
      },
      success_url: `${siteUrl}/rifa.html?id=${raffleId}&pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/rifa.html?id=${raffleId}&pagamento=cancelado`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl: session.url }),
    };

  } catch (error) {
    console.error("Erro ao criar sessão na Stripe:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falha ao comunicar com a Stripe." }),
    };
  }
};
