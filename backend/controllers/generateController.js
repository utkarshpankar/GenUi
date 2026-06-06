function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

function parseModelList(input) {
  if (!input || typeof input !== 'string') return []
  return input
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
}

function buildPrompt({ userPrompt, action, previousCode }) {
  const outputOnlyCode =
    'IMPORTANT: Return ONLY the final code. No explanation. No markdown. No code fences. No backticks.\n'

  const jsxBase =
    'Generate a clean, modern, responsive React functional component using Tailwind CSS.\n' +
    'Follow best practices, keep code reusable, and production-ready.\n' +
    'Do not import any external libraries or components (no icon packs, no UI libraries). Use plain React functional components and Tailwind CSS only.\n' +
    outputOnlyCode +
    `User request: ${userPrompt || ''}`

  if (action === 'explain') {
    return (
      'Explain the following React component clearly for a developer.\n' +
      'Use concise bullet points and mention layout, props, and how Tailwind classes work.\n\n' +
      `User request: ${userPrompt || ''}\n\n` +
      (previousCode || '')
    )
  }

  if (action === 'convert_ts') {
    return (
      'Convert the following React component to TypeScript (TSX).\n' +
      outputOnlyCode +
      'Requirements:\n' +
      '- Keep the UI and behavior identical.\n' +
      '- Add appropriate TypeScript types for props, state, and handlers.\n' +
      '- Do not add external imports beyond React.\n' +
      '- Ensure there is a default export React component.\n\n' +
      (previousCode || '')
    )
  }

  if (action === 'improve') {
    return (
      jsxBase +
      '\n\n' +
      'Existing code:\n' +
      (previousCode || '') +
      '\n\n' +
      'Improve the existing component while keeping the same intent.\n' +
      'Requirements:\n' +
      '- Do not change functionality or output behavior.\n' +
      '- Improve readability and structure (small helper components/functions are ok).\n' +
      '- Improve Tailwind styling subtly (spacing/typography/responsiveness), but do not change layout intent.\n' +
      outputOnlyCode
    )
  }

  // generate or regenerate
  return jsxBase + (previousCode ? `\n\nExisting code:\n${previousCode}` : '')
}

function extractCode(text) {
  if (!text) return ''
  const s = String(text).trim()
  const fenceMatch = s.match(/```(?:jsx|tsx|js|ts)?\s*([\s\S]*?)```/i)
  return (fenceMatch ? fenceMatch[1] : s).trim()
}

function toClientError(e) {
  const status = Number(e?.status || e?.response?.status || 500)
  const rawMessage = String(e?.message || e?.error?.message || 'Server error')

  if (status === 401 || /incorrect api key|invalid api key/i.test(rawMessage)) {
    return {
      status: 401,
      message: 'Invalid OpenRouter API key. Update OPENROUTER_API_KEY in backend/.env and restart backend.',
    }
  }

  if (status === 429 || /quota|rate limit|billing/i.test(rawMessage)) {
    return {
      status: 429,
      message:
        'OpenRouter quota/rate-limit reached. Check your OpenRouter credits/limits, or switch OPENROUTER_MODEL in backend/.env and retry.',
    }
  }
  if (status === 502 || status === 503 || status === 504) {
    return {
      status: 502,
      message:
        'AI provider is temporarily unavailable (502/503/504). Please retry in a few seconds. If it continues, switch OPENROUTER_MODEL to a stable paid model in backend/.env.',
    }
  }

  return { status: status >= 400 && status < 600 ? status : 500, message: rawMessage }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function generateHandler(req, res) {
  try {
    const { prompt, action, code } = req.body || {}
    const act = action || 'generate'
    const promptStr = typeof prompt === 'string' ? prompt : ''
    const codeStr = typeof code === 'string' ? code : ''

    // For improve/convert/explain we can operate on existing code even if prompt is empty.
    if ((act === 'generate' || act === 'regenerate') && promptStr.trim().length === 0) {
      return res.status(400).json({ error: 'prompt is required' })
    }
    if ((act === 'improve' || act === 'convert_ts' || act === 'explain') && codeStr.trim().length === 0) {
      return res.status(400).json({ error: 'code is required for this action' })
    }

    const apiKey = requireEnv('OPENROUTER_API_KEY')
    const defaultModel = process.env.OPENROUTER_MODEL || 'openrouter/auto'
    const fallbackModels = parseModelList(process.env.OPENROUTER_MODEL_FALLBACKS)
    const candidateModels = []
    for (const m of [defaultModel, ...fallbackModels]) {
      if (m && !candidateModels.includes(m)) candidateModels.push(m)
    }
    const siteUrl = process.env.OPENROUTER_SITE_URL || 'http://localhost:5173'
    const appName = process.env.OPENROUTER_APP_NAME || 'GenUI'

    const fullPrompt = buildPrompt({
      userPrompt: promptStr,
      action: act,
      previousCode: codeStr,
    })
    let completion = null
    let lastError = null
    // Retry across models for transient upstream failures (502/503/504, network hiccups).
    const maxAttemptsPerModel = 2
    for (const selectedModel of candidateModels) {
      for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt += 1) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': siteUrl,
              'X-Title': appName,
            },
            body: JSON.stringify({
              model: selectedModel,
              temperature: 0.5,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert React and Tailwind CSS assistant. Follow output format instructions exactly.',
                },
                { role: 'user', content: fullPrompt },
              ],
            }),
          })

          const payload = await response.json().catch(() => ({}))
          if (!response.ok) {
            const err = new Error(
              payload?.error?.message || payload?.error || `OpenRouter request failed: ${response.status}`
            )
            err.status = response.status
            throw err
          }

          completion = payload
          if (!completion?.choices?.[0]?.message?.content) throw new Error('OpenRouter returned no content')
          break
        } catch (err) {
          lastError = err
          const status = Number(err?.status || 0)
          const isTransient = status === 0 || status === 502 || status === 503 || status === 504
          const canRetry = isTransient && attempt < maxAttemptsPerModel
          if (canRetry) await wait(400 * attempt)
          if (!canRetry) break
        }
      }
      if (completion) break
    }
    if (!completion) throw lastError || new Error('All configured models failed')

    const text = completion?.choices?.[0]?.message?.content || ''

    if (act === 'explain') {
      return res.json({ prompt: promptStr, explanation: text.trim() })
    }

    const cleaned = extractCode(text)
    if (!cleaned) return res.status(500).json({ error: 'Empty response from OpenRouter' })
    return res.json({ prompt: promptStr, code: cleaned })
  } catch (e) {
    const mapped = toClientError(e)
    return res.status(mapped.status).json({ error: mapped.message })
  }
}

