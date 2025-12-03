import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Stripe from 'stripe'

const app = express()
app.use(cors())
app.use(express.json())

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
    console.error('Missing STRIPE_SECRET_KEY')
}
const stripe = new Stripe(stripeSecret || '', { apiVersion: '2024-10-28.acacia' })

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173'

// Map pack sizes to Stripe Price IDs (set in environment)
const PRICE_IDS = {
    5: process.env.PRICE_ID_5,
    10: process.env.PRICE_ID_10,
    25: process.env.PRICE_ID_25,
    50: process.env.PRICE_ID_50,
}

const TOKENS_BY_PRICE = {
    [process.env.PRICE_ID_5 || '']: 5,
    [process.env.PRICE_ID_10 || '']: 10,
    [process.env.PRICE_ID_25 || '']: 25,
    [process.env.PRICE_ID_50 || '']: 50,
}

app.get('/api', (req, res) => {
    res.send('Gravity Test API is running')
})

app.post('/api/checkout/session', async (req, res) => {
    try {
        const { pack } = req.body || {}
        console.log('Received checkout request for pack:', pack)
        const priceId = PRICE_IDS[pack]
        console.log('Price ID:', priceId)
        if (!priceId) {
            console.error('Invalid pack requested:', pack)
            return res.status(400).json({ error: 'Invalid pack' })
        }
        console.log('Creating Stripe session with:', {
            mode: 'payment',
            price: priceId,
            success_url: `${APP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_BASE_URL}/`,
        })
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${APP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_BASE_URL}/`,
            allow_promotion_codes: true,
            locale: 'en',
        })
        console.log('Session created successfully:', session.id)
        res.json({ url: session.url })
    } catch (err) {
        console.error('Error creating checkout session:', err.message)
        console.error('Full error:', err)
        res.status(500).json({ error: 'Failed to create session', details: err.message })
    }
})

// Log mapping on startup to verify env vars
console.log('Token pricing mapping:', TOKENS_BY_PRICE)

app.post('/api/checkout/verify', async (req, res) => {
    try {
        const { session_id } = req.body || {}
        console.log('Verifying session:', session_id)

        if (!session_id) {
            return res.status(400).json({ error: 'Missing session_id' })
        }

        const session = await stripe.checkout.sessions.retrieve(session_id)
        if (session.payment_status !== 'paid') {
            console.log('Payment not paid:', session.payment_status)
            return res.status(400).json({ error: 'Payment not completed' })
        }

        const lineItems = await stripe.checkout.sessions.listLineItems(session_id)
        console.log('Line items found:', JSON.stringify(lineItems.data, null, 2))

        let tokens = 0
        for (const item of lineItems.data) {
            const priceId = item.price?.id || ''
            const itemTokens = TOKENS_BY_PRICE[priceId] || 0
            const quantity = item.quantity || 1

            console.log(`Processing item: Price=${priceId}, TokensPerUnit=${itemTokens}, Qty=${quantity}`)

            tokens += (itemTokens * quantity)
        }

        console.log('Total tokens calculated:', tokens)

        if (!tokens) {
            return res.status(400).json({ error: 'No tokens found for session' })
        }
        res.json({ tokens })
    } catch (err) {
        console.error('Verify error:', err)
        res.status(500).json({ error: 'Failed to verify session', details: err.message })
    }
})

// For local development, listen on a port if not running in Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const port = process.env.PORT || 8787
    app.listen(port, () => {
        console.log(`Stripe server listening on http://localhost:${port}`)
    })
}

export default app
