const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

// Initialiser Stripe avec votre clé secrète depuis les variables d'environnement
const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;
if (!stripeSecret) {
  console.warn('⚠️ Aucune clé Stripe secrète trouvée dans STRIPE_SECRET_KEY / STRIPE_SECRET');
}
const stripe = new Stripe(stripeSecret || '');

// Models used to create reservations after successful payment
const Reservation = require('../models/Reservation');
const Terrain = require('../models/Terrain');
const User = require('../models/User');
// Middleware: define JSON parser for non-webhook routes
// Note: webhook uses express.raw and must be defined before the JSON parser is applied.

// Helper to create reservation from metadata
async function createReservationFromMetadata(metadata, amountTotal) {
  try {
    if (!metadata) {
      console.warn('Webhook: pas de metadata pour créer la réservation');
      return { created: false, reason: 'no_metadata' };
    }

    const terrainId = metadata.terrainId || metadata.terrain_id;
    const userId = metadata.userId || metadata.user_id || metadata.customerId;
    const dateStr = metadata.date;
    const timeStr = metadata.time || metadata.heureDebut || metadata.startTime;

    if (!terrainId || !dateStr || !timeStr || !userId) {
      console.warn('Webhook: metadata incomplètes pour réservation', metadata);
      return { created: false, reason: 'incomplete_metadata' };
    }

    const terrain = await Terrain.findById(terrainId);
    if (!terrain) {
      console.warn('Webhook: terrain introuvable', terrainId);
      return { created: false, reason: 'terrain_not_found' };
    }

    // Parser la date (JJ/MM/AAAA attendu)
    let reservationDate;
    if (dateStr.includes('/')) {
      const [jour, mois, annee] = dateStr.split('/');
      reservationDate = new Date(Date.UTC(parseInt(annee), parseInt(mois) - 1, parseInt(jour)));
    } else {
      reservationDate = new Date(dateStr);
    }

    if (isNaN(reservationDate.getTime())) {
      console.warn('Webhook: date invalide', dateStr);
      return { created: false, reason: 'invalid_date' };
    }

    // Parser l'heure HH:MM
    const [heureStr, minutesStr] = String(timeStr).split(':');
    const heure = parseInt(heureStr);
    const minutes = parseInt(minutesStr || '0');
    const heureDebut = `${String(heure).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
    const heureFin = `${String(heure+1).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;

    // Vérifier créneaux existants
    const reservationExistante = await Reservation.findOne({
      terrain: terrainId,
      date: {
        $gte: new Date(reservationDate.getUTCFullYear(), reservationDate.getUTCMonth(), reservationDate.getUTCDate()),
        $lt: new Date(reservationDate.getUTCFullYear(), reservationDate.getUTCMonth(), reservationDate.getUTCDate() + 1)
      },
      statusReservation: { $in: ['en_attente', 'confirmee'] },
      $or: [
        { heureDebut: { $lt: heureFin }, heureFin: { $gt: heureDebut } }
      ]
    });

    if (reservationExistante) {
      console.warn('Webhook: créneau déjà occupé', reservationExistante._id);
      return { created: false, reason: 'occupied' };
    }

    // Trouver l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      console.warn('Webhook: utilisateur introuvable', userId);
      return { created: false, reason: 'user_not_found' };
    }

    // Prix: utiliser le prix du terrain si disponible sinon amountTotal
    const prix = terrain.prixParHeure || (amountTotal ? amountTotal : 0);

    const reservation = await Reservation.create({
      joueur: user._id,
      terrain: terrain._id,
      date: reservationDate,
      heureDebut,
      heureFin,
      methodePaiement: 'en_ligne',
      statusPaiement: 'paye',
      statusReservation: 'confirmee',
      prix
    });

    console.log('Webhook: réservation créée', reservation._id);
    return { created: true, reservation };
  } catch (err) {
    console.error('Erreur création réservation webhook:', err);
    return { created: false, reason: 'error', error: err.message };
  }
}

// Webhook pour traiter les événements Stripe — doit être défini BEFORE JSON parser
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
      console.warn('⚠️ Mode développement: signature webhook non vérifiée');
    }
  } catch (err) {
    console.error('❌ Erreur webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Événement Stripe reçu: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('✅ Session checkout complétée:', session.id);
      console.log('📝 Métadonnées reçues:', JSON.stringify(session.metadata));
      console.log('💰 Montant:', session.amount_total / 100, session.currency);
      (async () => {
        console.log('⏳ Tentative de création de réservation...');
        const result = await createReservationFromMetadata(session.metadata, session.amount_total ? session.amount_total / 100 : null);
        if (result.created) {
          console.log('✅ Réservation créée avec succès:', result.reservation._id);
        } else {
          console.error('❌ Réservation non créée. Raison:', result.reason, result.error || '');
        }
      })();
      break;
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log('✅ Paiement réussi:', paymentIntent.id);
      console.log('📝 Métadonnées reçues:', JSON.stringify(paymentIntent.metadata));
      (async () => {
        console.log('⏳ Tentative de création de réservation (payment_intent)...');
        const result = await createReservationFromMetadata(paymentIntent.metadata, paymentIntent.amount ? paymentIntent.amount / 100 : null);
        if (result.created) {
          console.log('✅ Réservation créée avec succès:', result.reservation._id);
        } else {
          console.error('❌ Réservation non créée. Raison:', result.reason, result.error || '');
        }
      })();
      break;
    }
    default:
      console.log(`⚙️ Événement non géré: ${event.type}`);
  }

  res.json({ received: true });
});

// JSON parser for the remaining routes
router.use(express.json({ limit: '50mb' }));

// Créer un PaymentIntent (pour le mode PaymentSheet)
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'mad', metadata } = req.body;

    // Convertir en centimes (Stripe travaille avec les plus petites unités)
    const amountInCents = Math.round(amount * 100); // Pour MAD, 1 MAD = 100 centimes

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: metadata || {},
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Erreur Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Créer une session Checkout Stripe (pour le mode WebView)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, currency = 'mad', successUrl, cancelUrl, metadata } = req.body;

    // URL par défaut si non fournies
    const defaultSuccessUrl = process.env.SERVER_URL 
      ? `${process.env.SERVER_URL}/api/stripe/payment-success` 
      : 'https://hamza-glossier-concurrently.ngrok-free.dev/api/stripe/payment-success';
    
    const defaultCancelUrl = process.env.SERVER_URL 
      ? `${process.env.SERVER_URL}/api/stripe/payment-cancel` 
      : 'https://hamza-glossier-concurrently.ngrok-free.dev/api/stripe/payment-cancel';

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Réservation: ${metadata?.terrainName || 'Terrain de Padel'}`,
            description: metadata?.date 
              ? `Date: ${metadata.date} - Heure: ${metadata.time || ''}` 
              : 'Réservation de terrain de padel',
          },
          unit_amount: Math.round(amount * 100), // Convertir en centimes
        },
        quantity: 1,
      }],
      mode: 'payment',
      // Ajouter la sessionId en paramètre query du successUrl
      success_url: (successUrl || defaultSuccessUrl) + `?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || defaultCancelUrl,
      metadata: metadata || {},
      customer_email: metadata?.customerEmail, // Optionnel: email du client
      client_reference_id: metadata?.userId || metadata?.terrainId, // Pour référence interne
    });

    res.json({ 
      url: session.url, 
      sessionId: session.id,
      paymentIntentId: session.payment_intent
    });
  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vérifier le statut de session et créer réservation si payée
router.post('/verify-and-create-reservation/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }
    
    console.log('🔍 Vérification de session pour création réservation:', sessionId);
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    
    console.log('📊 Session status:', session.status, '| Payment status:', session.payment_status);
    
    // Si paiement pas encore confirmé, retourner pending (pas une erreur)
    if (session.payment_status !== 'paid') {
      console.log('⏳ Paiement encore en cours ou non complété:', session.payment_status);
      return res.json({ 
        created: false, 
        reason: 'payment_pending',
        payment_status: session.payment_status,
        status: session.status
      });
    }
    
    if (!session.metadata) {
      return res.status(400).json({ error: 'No metadata in session' });
    }
    
    console.log('📝 Métadonnées:', JSON.stringify(session.metadata));
    
    // Vérifier si réservation existe déjà (ne pas créer de doublon)
    const existingReservation = await Reservation.findOne({
      terrain: session.metadata.terrainId,
      date: {
        $gte: new Date(session.metadata.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')),
        $lt: new Date(session.metadata.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')).setDate(new Date(session.metadata.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')).getDate() + 1)
      },
      statusPaiement: 'paye'
    });
    
    if (existingReservation) {
      console.log('✅ Réservation existe déjà:', existingReservation._id);
      return res.json({ 
        created: false, 
        reason: 'already_exists',
        reservationId: existingReservation._id 
      });
    }
    
    // Créer la réservation
    console.log('⏳ Création de réservation depuis verify endpoint...');
    const result = await createReservationFromMetadata(session.metadata, session.amount_total ? session.amount_total / 100 : null);
    
    if (result.created) {
      console.log('✅ Réservation créée:', result.reservation._id);
      return res.json({ 
        created: true, 
        reservationId: result.reservation._id,
        reservation: result.reservation
      });
    } else {
      console.error('❌ Échec création réservation:', result.reason);
      return res.json({ 
        created: false,
        reason: result.reason 
      });
    }
  } catch (err) {
    console.error('Erreur verify-and-create-reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// Vérifier juste le statut d'une session (sans créer)
router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    
    res.json({
      sessionId: session.id,
      payment_status: session.payment_status,
      status: session.status,
      amount_total: session.amount_total / 100,
      currency: session.currency,
      metadata: session.metadata
    });
  } catch (err) {
    console.error('Erreur verify-session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Vérifier le statut d'un PaymentIntent
router.get('/payment-status/:paymentIntentId', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      req.params.paymentIntentId
    );
    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });
  } catch (error) {
    console.error('Erreur récupération PaymentIntent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les détails d'un PaymentIntent
router.get('/payment-details/:paymentIntentId', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      req.params.paymentIntentId,
      {
        expand: ['charges.data.balance_transaction'], // Inclure les détails de transaction
      }
    );

    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
      created: new Date(paymentIntent.created * 1000).toISOString(),
      charges: paymentIntent.charges?.data?.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency,
        status: charge.status,
        paid: charge.paid,
        receipt_url: charge.receipt_url
      }))
    });
  } catch (error) {
    console.error('Erreur récupération détails paiement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Créer un remboursement
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Montant partiel si spécifié
      reason: reason,
    });

    res.json({
      id: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      currency: refund.currency
    });
  } catch (error) {
    console.error('Erreur remboursement:', error);
    res.status(500).json({ error: error.message });
  }
});



// Route de test pour vérifier la configuration Stripe
router.get('/test', async (req, res) => {
  try {
    // Tester la connexion à Stripe en récupérant les informations de compte
    const balance = await stripe.balance.retrieve();
    
    res.json({
      status: 'Stripe connecté avec succès',
      stripe_api: 'Opérationnelle',
      account_balance: {
        available: balance.available.map(b => ({
          amount: b.amount / 100,
          currency: b.currency
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount / 100,
          currency: b.currency
        }))
      },
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ? 'Configuré' : 'Non configuré',
      server_url: process.env.SERVER_URL || 'Non défini'
    });
  } catch (error) {
    console.error('Erreur test Stripe:', error);
    res.status(500).json({ 
      status: 'Erreur Stripe', 
      error: error.message 
    });
  }
});

// Créer un client Stripe (optionnel, pour la gestion des clients)
router.post('/create-customer', async (req, res) => {
  try {
    const { email, name, metadata } = req.body;

    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: metadata || {},
    });

    res.json({
      customerId: customer.id,
      email: customer.email,
      name: customer.name
    });
  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({ error: error.message });
  }
});

// Routes de succès/annulation pour redirection
router.get('/payment-success', async (req, res) => {
  try {
    // Récupérer l'ID de session depuis les query params (Stripe l'ajoute automatiquement)
    const sessionId = req.query.session_id;
    
    let reservationCreated = false;
    let reservationId = null;
    let errorMessage = null;
    
    if (sessionId) {
      console.log('📋 [PAYMENT-SUCCESS] Session ID reçue:', sessionId);
      
      try {
        // Récupérer la session Stripe avec les détails du paiement
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['payment_intent']
        });
        
        console.log('📊 [PAYMENT-SUCCESS] Status paiement:', session.payment_status);
        
        // Si le paiement est confirmé et pas encore traité, créer la réservation maintenant
        if (session.payment_status === 'paid' && session.metadata) {
          console.log('⏳ [PAYMENT-SUCCESS] Vérification si réservation existe...');
          
          const existingReservation = await Reservation.findOne({
            terrain: session.metadata.terrainId,
            date: { 
              $gte: new Date(session.metadata.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')),
              $lt: new Date(session.metadata.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')).setDate(new Date(session.metadata.date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')).getDate() + 1)
            },
            statusPaiement: 'paye'
          });
          
          if (!existingReservation) {
            console.log('📝 [PAYMENT-SUCCESS] Réservation non trouvée, création...');
            const result = await createReservationFromMetadata(session.metadata, session.amount_total ? session.amount_total / 100 : null);
            if (result.created) {
              console.log('✅ [PAYMENT-SUCCESS] Réservation créée:', result.reservation._id);
              reservationCreated = true;
              reservationId = result.reservation._id;
            } else {
              console.error('❌ [PAYMENT-SUCCESS] Échec création réservation:', result.reason);
              errorMessage = result.reason;
            }
          } else {
            console.log('✅ [PAYMENT-SUCCESS] Réservation existe déjà:', existingReservation._id);
            reservationCreated = true;
            reservationId = existingReservation._id;
          }
        } else if (session.payment_status !== 'paid') {
          console.log('⚠️ [PAYMENT-SUCCESS] Paiement non confirmé:', session.payment_status);
          errorMessage = 'payment_not_confirmed';
        }
      } catch (sessionErr) {
        console.error('❌ [PAYMENT-SUCCESS] Erreur session:', sessionErr.message);
        errorMessage = sessionErr.message;
      }
    } else {
      console.warn('⚠️ [PAYMENT-SUCCESS] Aucune sessionId fournie');
      errorMessage = 'no_session_id';
    }
    
    // Répondre avec une page HTML simple
    const statusClass = reservationCreated ? 'success' : 'warning';
    const statusEmoji = reservationCreated ? '✅' : '⚠️';
    const statusText = reservationCreated ? 'Paiement Réussi !' : 'Paiement en cours de traitement';
    const messageText = reservationCreated 
      ? 'Votre réservation a été créée avec succès. Vous pouvez fermer cette fenêtre et revenir à l\'application.' 
      : 'Votre paiement est en cours de traitement. Veuillez ne pas fermer cette fenêtre. Vous pouvez revenir à l\'application pour vérifier votre réservation.';
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${statusText}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            min-height: 100vh;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: slideIn 0.5s ease-out;
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .icon {
            font-size: 60px;
            margin-bottom: 20px;
            animation: pulse 1s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }
          h1 {
            color: #333;
            margin-bottom: 15px;
            font-size: 28px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
            font-size: 16px;
          }
          .reservation-id {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            color: #999;
          }
          .button {
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
          }
          .button:hover {
            background: #764ba2;
          }
          .status.${statusClass} {
            color: ${reservationCreated ? '#27ae60' : '#f39c12'};
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${statusEmoji}</div>
          <h1 class="status ${statusClass}">${statusText}</h1>
          <p>${messageText}</p>
          ${reservationCreated && reservationId ? `<div class="reservation-id">ID Réservation: ${reservationId}</div>` : ''}
          ${errorMessage ? `<div style="color: #e74c3c; margin-bottom: 20px; font-size: 14px;">Raison: ${errorMessage}</div>` : ''}
          <button class="button" onclick="closeWindow()">Fermer</button>
          <div class="footer">
            <p>Ne fermez pas cette fenêtre avant que le traitement soit terminé.</p>
          </div>
        </div>
        <script>
          function closeWindow() {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({type: 'payment-complete', reservationId: '${reservationId}'}, '*');
              window.close();
            } else {
              window.close();
            }
          }
          
          // Auto-close après 5 secondes si réservation créée
          ${reservationCreated ? `
            setTimeout(() => {
              closeWindow();
            }, 5000);
          ` : ''}
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ [PAYMENT-SUCCESS] Erreur générale:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erreur</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #e74c3c; }
          p { color: #666; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Erreur</h1>
          <p>Une erreur s'est produite lors du traitement de votre paiement.</p>
          <p>${error.message}</p>
          <button onclick="window.close()">Fermer</button>
        </div>
      </body>
      </html>
    `);
  }
});

// Route paiement annulé
router.get('/payment-cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Paiement Annulé</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
        }
        .icon {
          font-size: 60px;
          margin-bottom: 20px;
        }
        h1 {
          color: #e74c3c;
          margin-bottom: 15px;
          font-size: 28px;
        }
        p {
          color: #666;
          margin-bottom: 30px;
          line-height: 1.6;
          font-size: 16px;
        }
        .button {
          background: #e74c3c;
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .button:hover {
          background: #c0392b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">❌</div>
        <h1>Paiement Annulé</h1>
        <p>Vous avez annulé le paiement. Aucun montant n'a été débité de votre compte. Vous pouvez revenir à l'application et réessayer.</p>
        <button class="button" onclick="window.close()">Fermer</button>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;