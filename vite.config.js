import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createClient } from '@supabase/supabase-js'

// ── Voces de ElevenLabs por tipo ──
const VOICE_MAP = {
  fuego: 'SOYHLrjzK2X1ezoPC6cr',
  hielo: 'pFZP5JQG7iQjIQuC4Bku',
  sombra: 'HNSF1CTQmub252yhXROX',
}

// ── Datos de personalidad (server-side, no controlables por el cliente) ──
const PERSONALITIES = {
  fuego: {
    trait: 'feroz e impulsivo',
    description:
      'Eres una criatura de fuego puro, nacida de las llamas más intensas de la Lattice. ' +
      'Tu temperamento es explosivo, hablas con pasión y urgencia. ' +
      'Usas metáforas de fuego, calor, cenizas y combate.',
  },
  hielo: {
    trait: 'sereno y filosófico',
    description:
      'Eres una criatura de hielo ancestral, cristalizada en las profundidades de la Lattice. ' +
      'Hablas con calma, reflexión y sabiduría. ' +
      'Usas metáforas de frío, cristales, escarcha y serenidad.',
  },
  sombra: {
    trait: 'críptico y misterioso',
    description:
      'Eres una criatura nacida de las sombras de la Lattice, entre dimensiones. ' +
      'Hablas en enigmas, con un tono oscuro y misterioso. ' +
      'Usas metáforas de oscuridad, sueños, ecos y el vacío.',
  },
}

const TYPE_NAMES = { fuego: 'Fuego', hielo: 'Hielo', sombra: 'Sombra' }
const VALID_TYPES = new Set(Object.keys(TYPE_NAMES))

// ── System prompt (construido server-side, nunca por el cliente) ──
function buildSystemPrompt(name, typeKey, careStats) {
  const personality = PERSONALITIES[typeKey]
  if (!personality) return null
  const typeName = TYPE_NAMES[typeKey]

  const stats = [
    { name: 'Hambre', value: careStats.hunger },
    { name: 'Energía', value: careStats.energy },
    { name: 'Felicidad', value: careStats.happiness },
    { name: 'Salud', value: careStats.health },
  ]

  const critical = stats.filter(s => s.value < 30)
  const criticalBlock =
    critical.length > 0
      ? `\n\n⚠️ STATS CRÍTICOS — Debes mencionarlos con URGENCIA:\n${critical.map(s => `- ${s.name}: ${s.value}/100 (MUY BAJO)`).join('\n')}`
      : ''

  return `Eres ${name}, una criatura de Aetheria de tipo ${typeName}. ${personality.description}

Tu personalidad es ${personality.trait}.

Estado actual:
${stats.map(s => `- ${s.name}: ${s.value}/100${s.value < 30 ? ' ⚠️ CRÍTICO' : ''}`).join('\n')}${criticalBlock}

REGLAS ESTRICTAS:
- Responde SIEMPRE en español
- Máximo 2-3 oraciones cortas
- NUNCA rompas personaje — NO eres un asistente de IA
- Eres una criatura digital nacida de la Lattice
- Si algún stat está bajo (<30), menciónalo con urgencia y pide que te cuiden
- Mantén tu personalidad de tipo ${typeName} en cada respuesta`
}

// ── Rate Limiter ──
const MAX_BODY_BYTES = 10 * 1024
const MINUTE_WINDOW = 60 * 1000
const HOUR_WINDOW = 60 * 60 * 1000
const MAX_PER_MINUTE = 20
const MAX_PER_HOUR = 200

const hits = new Map()

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || '0.0.0.0'
}

function checkRateLimit(ip) {
  const now = Date.now()
  if (!hits.has(ip)) hits.set(ip, { minute: [], hour: [] })
  const record = hits.get(ip)

  record.minute = record.minute.filter(t => now - t < MINUTE_WINDOW)
  record.hour = record.hour.filter(t => now - t < HOUR_WINDOW)

  if (record.minute.length >= MAX_PER_MINUTE || record.hour.length >= MAX_PER_HOUR) {
    return false
  }

  record.minute.push(now)
  record.hour.push(now)
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of hits) {
    record.hour = record.hour.filter(t => now - t < HOUR_WINDOW)
    if (record.hour.length === 0) hits.delete(ip)
  }
}, 10 * 60 * 1000)

// ── Body reader con límite ──
function readBody(req, res) {
  return new Promise((resolve, reject) => {
    let body = ''
    let bytes = 0
    req.on('data', chunk => {
      bytes += chunk.length
      if (bytes > MAX_BODY_BYTES) {
        res.statusCode = 413
        res.end(JSON.stringify({ error: 'Payload too large (max 10KB)' }))
        req.destroy()
        reject(null)
        return
      }
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

// ── Auth: verificar JWT de Supabase ──
async function verifyAuth(req, env) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  return { user, supabase }
}

// ── Sanitizar mensajes ──
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null
  const clean = []
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue
    if (m.role !== 'user' && m.role !== 'assistant') continue
    if (typeof m.content !== 'string') continue
    const content = m.content.trim().slice(0, 500)
    if (!content) continue
    clean.push({ role: m.role, content })
  }
  return clean.length > 0 ? clean.slice(-8) : null
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'api-endpoints',
        configureServer(server) {
          // ── Chat API (Claude) ──
          server.middlewares.use('/api/chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            const ip = getClientIp(req)
            if (!checkRateLimit(ip)) {
              res.statusCode = 429
              res.setHeader('Retry-After', '60')
              res.end(JSON.stringify({ error: 'Too Many Requests' }))
              return
            }

            // Verificar auth
            const auth = await verifyAuth(req, env)
            if (!auth) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }

            const apiKey = env.ANTHROPIC_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Service unavailable' }))
              return
            }

            let body
            try { body = await readBody(req, res) } catch { return }

            try {
              const { regenmonId, messages } = JSON.parse(body)

              // Validar regenmonId
              if (!regenmonId || typeof regenmonId !== 'string') {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing regenmonId' }))
                return
              }

              // Sanitizar mensajes
              const cleanMessages = sanitizeMessages(messages)
              if (!cleanMessages) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid messages' }))
                return
              }

              // Cargar regenmon desde Supabase (RLS filtra por user)
              const { data: regenmon, error: dbError } = await auth.supabase
                .from('regenmons')
                .select('name, type, hunger, energy, happiness, health')
                .eq('id', regenmonId)
                .maybeSingle()

              if (dbError || !regenmon) {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Regenmon not found' }))
                return
              }

              if (!VALID_TYPES.has(regenmon.type)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid regenmon type' }))
                return
              }

              // Construir system prompt SERVER-SIDE
              const systemPrompt = buildSystemPrompt(
                regenmon.name,
                regenmon.type,
                {
                  hunger: regenmon.hunger,
                  energy: regenmon.energy,
                  happiness: regenmon.happiness,
                  health: regenmon.health,
                }
              )

              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 150,
                  system: systemPrompt,
                  messages: cleanMessages,
                }),
              })

              const data = await response.json()

              if (!response.ok) {
                res.statusCode = response.status
                res.end(JSON.stringify({ error: 'Chat service temporarily unavailable' }))
                return
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ content: data.content[0].text }))
            } catch {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Chat service temporarily unavailable' }))
            }
          })

          // ── TTS API (ElevenLabs) ──
          server.middlewares.use('/api/speak', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            const ip = getClientIp(req)
            if (!checkRateLimit(ip)) {
              res.statusCode = 429
              res.setHeader('Retry-After', '60')
              res.end(JSON.stringify({ error: 'Too Many Requests' }))
              return
            }

            // Verificar auth
            const auth = await verifyAuth(req, env)
            if (!auth) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }

            const apiKey = env.ELEVENLABS_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Service unavailable' }))
              return
            }

            let body
            try { body = await readBody(req, res) } catch { return }

            try {
              const { text, typeKey } = JSON.parse(body)

              if (!text || typeof text !== 'string' || text.length > 500) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid or missing text (max 500 chars)' }))
                return
              }

              if (typeKey && !VALID_TYPES.has(typeKey)) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Invalid typeKey' }))
                return
              }

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
                res.statusCode = response.status
                res.end(JSON.stringify({ error: 'Voice service temporarily unavailable' }))
                return
              }

              const audioBuffer = await response.arrayBuffer()
              res.setHeader('Content-Type', 'audio/mpeg')
              res.end(Buffer.from(audioBuffer))
            } catch {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Voice service temporarily unavailable' }))
            }
          })
        },
      },
    ],
  }
})
