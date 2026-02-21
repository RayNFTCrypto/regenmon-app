import { createClient } from '@supabase/supabase-js'

// ── Datos de personalidad (server-side) ──
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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Service unavailable' })
  }

  // ── Validar body ──
  const { regenmonId, messages } = req.body || {}

  if (!regenmonId || typeof regenmonId !== 'string') {
    return res.status(400).json({ error: 'Missing regenmonId' })
  }

  const cleanMessages = sanitizeMessages(messages)
  if (!cleanMessages) {
    return res.status(400).json({ error: 'Invalid messages' })
  }

  try {
    // ── Cargar regenmon desde Supabase (RLS filtra por user) ──
    const { data: regenmon, error: dbError } = await supabase
      .from('regenmons')
      .select('name, type, hunger, energy, happiness, health')
      .eq('id', regenmonId)
      .maybeSingle()

    if (dbError || !regenmon) {
      return res.status(404).json({ error: 'Regenmon not found' })
    }

    if (!VALID_TYPES.has(regenmon.type)) {
      return res.status(400).json({ error: 'Invalid regenmon type' })
    }

    // ── Construir system prompt SERVER-SIDE ──
    const systemPrompt = buildSystemPrompt(regenmon.name, regenmon.type, {
      hunger: regenmon.hunger,
      energy: regenmon.energy,
      happiness: regenmon.happiness,
      health: regenmon.health,
    })

    // ── Llamar Claude API ──
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
      return res.status(response.status).json({ error: 'Chat service temporarily unavailable' })
    }

    return res.status(200).json({ content: data.content[0].text })
  } catch {
    return res.status(500).json({ error: 'Chat service temporarily unavailable' })
  }
}
