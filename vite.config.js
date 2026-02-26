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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
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

          // ── Earn API ──
          server.middlewares.use('/api/earn', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            const auth = await verifyAuth(req, env)
            if (!auth) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }

            let body
            try { body = await readBody(req, res) } catch { return }

            try {
              const { action, walletAddress, stakeAmount, missionId, reward } = JSON.parse(body)
              if (!action || !walletAddress) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing action or walletAddress' }))
                return
              }

              const { data: profile } = await auth.supabase
                .from('profiles')
                .select('*')
                .eq('id', auth.user.id)
                .single()

              if (!profile) {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Profile not found' }))
                return
              }

              // Mint helper
              const mintTokens = async (to, amount) => {
                const pk = env.DEPLOYER_PRIVATE_KEY
                const tokenAddr = env.VITE_REGEN_TOKEN_ADDRESS
                if (!pk || !tokenAddr) return { txHash: 'demo-mode', amount }
                const { createWalletClient, http, parseUnits, defineChain } = await import('viem')
                const { privateKeyToAccount } = await import('viem/accounts')
                const chain = defineChain({
                  id: 10143, name: 'Monad Testnet',
                  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                  rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz/'] } },
                  testnet: true,
                })
                const account = privateKeyToAccount(pk)
                const client = createWalletClient({ account, chain, transport: http('https://testnet-rpc.monad.xyz/') })
                const hash = await client.writeContract({
                  address: tokenAddr,
                  abi: [{ name: 'mintReward', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] }],
                  functionName: 'mintReward',
                  args: [to, parseUnits(String(amount), 18)],
                })
                return { txHash: hash, amount }
              }

              res.setHeader('Content-Type', 'application/json')

              // Daily Check-in
              if (action === 'daily') {
                const last = profile.last_daily_claim ? new Date(profile.last_daily_claim) : null
                if (last) {
                  const hrs = (Date.now() - last.getTime()) / (1000 * 60 * 60)
                  if (hrs < 24) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: `Disponible en ${Math.ceil(24 - hrs)}h` }))
                    return
                  }
                }
                const result = await mintTokens(walletAddress, 50)
                await auth.supabase.from('profiles').update({ last_daily_claim: new Date().toISOString() }).eq('id', auth.user.id)
                res.end(JSON.stringify({ ...result, type: 'daily' }))
                return
              }

              // Care Reward
              if (action === 'care') {
                const last = profile.last_care_claim ? new Date(profile.last_care_claim) : null
                if (last) {
                  const hrs = (Date.now() - last.getTime()) / (1000 * 60 * 60)
                  if (hrs < 4) {
                    res.statusCode = 400
                    res.end(JSON.stringify({ error: `Disponible en ${Math.ceil((4 - hrs) * 60)} min` }))
                    return
                  }
                }
                const { data: rmon } = await auth.supabase.from('regenmons').select('hunger, energy, happiness, health').eq('user_id', auth.user.id).single()
                if (!rmon) { res.statusCode = 404; res.end(JSON.stringify({ error: 'No creature' })); return }
                const avg = (rmon.hunger + rmon.energy + rmon.happiness + rmon.health) / 4
                const rwd = avg >= 80 ? 30 : avg >= 60 ? 20 : avg >= 40 ? 10 : 0
                if (!rwd) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Stats muy bajos (min 40%)' })); return }
                const result = await mintTokens(walletAddress, rwd)
                await auth.supabase.from('profiles').update({ last_care_claim: new Date().toISOString() }).eq('id', auth.user.id)
                res.end(JSON.stringify({ ...result, type: 'care' }))
                return
              }

              // Stake
              if (action === 'stake') {
                const amt = parseInt(stakeAmount)
                if (!amt || amt <= 0) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Invalid amount' })); return }
                const cur = profile.staked_amount || 0
                await auth.supabase.from('profiles').update({ staked_amount: cur + amt, staked_at: profile.staked_at || new Date().toISOString() }).eq('id', auth.user.id)
                res.end(JSON.stringify({ staked: cur + amt, type: 'stake' }))
                return
              }

              // Claim Staking Rewards
              if (action === 'claim-stake') {
                const staked = profile.staked_amount || 0
                const stakedAt = profile.staked_at ? new Date(profile.staked_at) : null
                if (!staked || !stakedAt) { res.statusCode = 400; res.end(JSON.stringify({ error: 'No REGEN stakeados' })); return }
                const days = (Date.now() - stakedAt.getTime()) / (1000 * 60 * 60 * 24)
                const rwd = Math.floor(staked * 0.05 * days)
                if (rwd < 1) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Aun no hay rewards' })); return }
                const result = await mintTokens(walletAddress, rwd)
                await auth.supabase.from('profiles').update({ staked_at: new Date().toISOString() }).eq('id', auth.user.id)
                res.end(JSON.stringify({ ...result, type: 'claim-stake' }))
                return
              }

              // Unstake
              if (action === 'unstake') {
                const staked = profile.staked_amount || 0
                if (!staked) { res.statusCode = 400; res.end(JSON.stringify({ error: 'No REGEN stakeados' })); return }
                const stakedAt = profile.staked_at ? new Date(profile.staked_at) : new Date()
                const days = (Date.now() - stakedAt.getTime()) / (1000 * 60 * 60 * 24)
                const rwd = Math.floor(staked * 0.05 * days)
                const result = await mintTokens(walletAddress, staked + rwd)
                await auth.supabase.from('profiles').update({ staked_amount: 0, staked_at: null }).eq('id', auth.user.id)
                res.end(JSON.stringify({ ...result, unstaked: staked, reward: rwd, type: 'unstake' }))
                return
              }

              // Claim Mission
              if (action === 'claim-mission') {
                if (!missionId || !reward) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing data' })); return }
                const claimed = profile.claimed_missions || []
                if (claimed.includes(missionId)) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Mision ya reclamada' })); return }
                const result = await mintTokens(walletAddress, reward)
                await auth.supabase.from('profiles').update({ claimed_missions: [...claimed, missionId] }).eq('id', auth.user.id)
                res.end(JSON.stringify({ ...result, type: 'mission', missionId }))
                return
              }

              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Unknown action' }))
            } catch (err) {
              console.error('Earn error:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Operation failed' }))
            }
          })

          // ── Airdrop API ──
          server.middlewares.use('/api/airdrop', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            const auth = await verifyAuth(req, env)
            if (!auth) {
              res.statusCode = 401
              res.end(JSON.stringify({ error: 'Unauthorized' }))
              return
            }

            let body
            try { body = await readBody(req, res) } catch { return }

            try {
              const { walletAddress } = JSON.parse(body)
              if (!walletAddress) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing walletAddress' }))
                return
              }

              const { data: profile } = await auth.supabase
                .from('profiles')
                .select('airdrop_claimed')
                .eq('id', auth.user.id)
                .single()

              if (profile?.airdrop_claimed) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Airdrop ya reclamado' }))
                return
              }

              // Mint 2000 REGEN
              const pk = env.DEPLOYER_PRIVATE_KEY
              const tokenAddr = env.VITE_REGEN_TOKEN_ADDRESS
              let txHash = 'demo-mode'
              if (pk && tokenAddr) {
                const { createWalletClient, http, parseUnits, defineChain } = await import('viem')
                const { privateKeyToAccount } = await import('viem/accounts')
                const chain = defineChain({
                  id: 10143, name: 'Monad Testnet',
                  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                  rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz/'] } },
                  testnet: true,
                })
                const account = privateKeyToAccount(pk)
                const client = createWalletClient({ account, chain, transport: http('https://testnet-rpc.monad.xyz/') })
                txHash = await client.writeContract({
                  address: tokenAddr,
                  abi: [{ name: 'mintReward', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] }],
                  functionName: 'mintReward',
                  args: [walletAddress, parseUnits('2000', 18)],
                })
              }

              await auth.supabase.from('profiles').update({ airdrop_claimed: true }).eq('id', auth.user.id)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ txHash, amount: 2000 }))
            } catch (err) {
              console.error('Airdrop error:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Minting failed' }))
            }
          })
        },
      },
    ],
  }
})
