import { createClient } from '@supabase/supabase-js'

const VOICE_MAP = {
  fuego: 'SOYHLrjzK2X1ezoPC6cr',
  hielo: 'pFZP5JQG7iQjIQuC4Bku',
  sombra: 'HNSF1CTQmub252yhXROX',
}

const VALID_TYPES = new Set(Object.keys(VOICE_MAP))

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Verificar auth ──
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // ── Validar API key ──
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Service unavailable' })
  }

  // ── Validar body ──
  const { text, typeKey } = req.body || {}

  if (!text || typeof text !== 'string' || text.length > 500) {
    return res.status(400).json({ error: 'Invalid or missing text (max 500 chars)' })
  }

  if (typeKey && !VALID_TYPES.has(typeKey)) {
    return res.status(400).json({ error: 'Invalid typeKey' })
  }

  try {
    const voiceId = VOICE_MAP[typeKey] || VOICE_MAP.fuego

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.4,
          },
        }),
      }
    )

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Voice service temporarily unavailable' })
    }

    const audioBuffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'audio/mpeg')
    return res.send(Buffer.from(audioBuffer))
  } catch {
    return res.status(500).json({ error: 'Voice service temporarily unavailable' })
  }
}
