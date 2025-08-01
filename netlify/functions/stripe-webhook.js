// netlify/functions/stripe-webhook.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('./firebase-admin-config');
const db = admin.firestore();
const endpointSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;

exports.handler = async ({ body, headers }) => {
  const sig = headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      try {
        const metadata = session.metadata;
        const raffleId = metadata.raffle_id;
        const selectedNumbers = JSON.parse(metadata.selected_numbers);
        
        const playerData = {
            userId: metadata.user_id,
            name: metadata.user_name,
            email: metadata.user_email,
            whatsapp: metadata.user_whatsapp,
            pix: metadata.user_pix,
            vendorId: metadata.vendor_id || null,
            createdAt: new Date()
        };

        const soldNumbersRef = db.collection('rifas').doc(raffleId).collection('sold_numbers');
        const batch = db.batch();

        selectedNumbers.forEach(number => {
            const docRef = soldNumbersRef.doc(number);
            batch.set(docRef, playerData);
        });

        const raffleRef = db.collection('rifas').doc(raffleId);
        const increment = selectedNumbers.length;
        batch.update(raffleRef, { 
            soldCount: admin.firestore.FieldValue.increment(increment) 
        });

        await batch.commit();
        console.log(`SUCCESS: Numbers ${selectedNumbers.join(', ')} for raffle ${raffleId} saved successfully.`);

      } catch (dbError) {
        console.error('DATABASE ERROR:', dbError);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
