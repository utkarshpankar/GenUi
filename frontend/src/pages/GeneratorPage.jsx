import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '../components/Button'
import { CodeBlock } from '../components/CodeBlock'
import { Tabs } from '../components/Tabs'
import { checkBackendHealth } from '../lib/api'
import { addHistoryItem } from '../redux/slices/historySlice'
import { setPrompt } from '../redux/slices/promptSlice'
import { generateComponent, setCode } from '../redux/slices/componentSlice'
import { toggleTheme } from '../redux/slices/uiSlice'

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function useRootTheme(theme) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
}

export default function GeneratorPage() {
  const dispatch = useDispatch()
  const prompt = useSelector((s) => s.prompt.value)
  const { code, explanation } = useSelector((s) => s.component)
  const { items } = useSelector((s) => s.history)
  const { loading, error, theme } = useSelector((s) => s.ui)
  const isDark = theme === 'dark'

  const [tab, setTab] = useState('code')
  const [backendOnline, setBackendOnline] = useState(null)

  useRootTheme(theme)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      const ok = await checkBackendHealth()
      if (!cancelled) setBackendOnline(ok)
    }

    poll()
    const id = window.setInterval(poll, 8000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const canGenerate = prompt.trim().length > 3 && !loading

  const panelClass = isDark
    ? 'rounded-2xl bg-white/5 ring-1 ring-inset ring-white/10 p-4'
    : 'rounded-2xl bg-white ring-1 ring-inset ring-black/10 p-4'

  const cardTitleClass = isDark ? 'text-zinc-200' : 'text-zinc-700'
  const mutedClass = isDark ? 'text-zinc-400' : 'text-zinc-500'

  const textareaClass = isDark
    ? 'mt-3 h-36 w-full resize-none rounded-xl bg-zinc-950/50 ring-1 ring-inset ring-white/10 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60'
    : 'mt-3 h-36 w-full resize-none rounded-xl bg-white ring-1 ring-inset ring-black/10 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/60'

  const explanationClass = isDark
    ? 'mt-3 rounded-xl bg-zinc-950/40 ring-1 ring-inset ring-white/10 p-3 text-sm text-zinc-200 whitespace-pre-wrap'
    : 'mt-3 rounded-xl bg-white ring-1 ring-inset ring-black/10 p-3 text-sm text-zinc-700 whitespace-pre-wrap'

  const errorClass = isDark
    ? 'mt-4 rounded-xl bg-rose-500/10 ring-1 ring-inset ring-rose-500/30 p-3 text-sm text-rose-200'
    : 'mt-4 rounded-xl bg-rose-500/10 ring-1 ring-inset ring-rose-500/30 p-3 text-sm text-rose-700'

  const historyItemClass = isDark
    ? 'w-full text-left rounded-xl bg-zinc-950/40 ring-1 ring-inset ring-white/10 p-3 hover:bg-zinc-950/55 transition'
    : 'w-full text-left rounded-xl bg-white ring-1 ring-inset ring-black/10 p-3 hover:bg-zinc-100 transition'

  const skeletonBgClass = isDark ? 'bg-white/10' : 'bg-black/5'

  function toPreviewSource(input) {
    let s = (input || '').replace(/\r\n/g, '\n')
    // Strip markdown code fences if model returns wrapped code blocks.
    s = s.replace(/^```[a-zA-Z]*\s*\n/, '').replace(/\n```\s*$/, '')
    // Some models prepend a bare language hint (e.g. "javascript", "tsx") on first line.
    // Remove it so eval/transpile doesn't treat it as an undefined identifier.
    s = s.replace(/^\s*(javascript|typescript|jsx|tsx|js|ts)\s*\n/i, '')
    // Some model outputs can contain stray control characters that break Babel parsing.
    // Keep newlines/tabs, strip the rest of non-printable ASCII.
    // eslint-disable-next-line no-control-regex
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    s = s.replace(/<\/script>/gi, '<\\/script>')

    // Parse imports and create simple sandbox shims for common patterns.
    // This keeps preview alive for outputs that depend on React hooks/icons.
    const shimLines = []
    const importLines = [...s.matchAll(/^\s*import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm)]
    for (const [, rawSpec, rawSource] of importLines) {
      const spec = String(rawSpec || '').trim()
      const source = String(rawSource || '').trim()

      const namedBlockMatch = spec.match(/\{([^}]*)\}/)
      const namedEntries = namedBlockMatch?.[1]
        ? namedBlockMatch[1]
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
        : []

      const defaultName = spec
        .replace(/\{[^}]*\}/g, '')
        .split(',')
        .map((x) => x.trim())
        .find(Boolean)

      const namespaceMatch = spec.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)
      const namespaceName = namespaceMatch?.[1] || null

      if (source === 'react') {
        if (defaultName && defaultName !== 'React') {
          shimLines.push(`const ${defaultName} = React;`)
        }
        if (namespaceName) {
          shimLines.push(`const ${namespaceName} = React;`)
        }
        for (const entry of namedEntries) {
          const parts = entry.split(/\s+as\s+/)
          const imported = (parts[0] || '').trim()
          const local = (parts[1] || parts[0] || '').trim()
          if (imported && local) {
            shimLines.push(`const ${local} = React.${imported};`)
          }
        }
      } else if (source === 'prop-types') {
        const propTypesName = defaultName || 'PropTypes'
        shimLines.push(`const ${propTypesName} = window.PropTypes;`)
      } else {
        if (defaultName) {
          shimLines.push(
            `const ${defaultName} = window.${defaultName} || ((props = {}) => React.createElement('span', props));`
          )
        }
        if (namespaceName) {
          shimLines.push(`const ${namespaceName} = window.${namespaceName} || {};`)
        }
        for (const entry of namedEntries) {
          const parts = entry.split(/\s+as\s+/)
          const local = (parts[1] || parts[0] || '').trim()
          if (local) {
            shimLines.push(`const ${local} = window.${local} || ((props = {}) => React.createElement('span', props));`)
          }
        }
      }
    }

    // Remove type-only imports and all ESM imports (including multiline/side-effect imports).
    // The preview runs via eval in a classic script context, so any remaining `import` will crash.
    s = s.replace(/^\s*import\s+type[\s\S]*?;?\s*$/gm, '')
    s = s.replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    s = s.replace(/^\s*import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    if (shimLines.length) {
      s = `${shimLines.join('\n')}\n${s}`
    }

    // Convert ESM default exports into a safe alias `__GenuiComponent`.
    // This avoids redeclaration issues when the exported name is literally `Component`.
    let defaultExportName = null
    const mFn = s.match(/export\s+default\s+function\s+(\w+)/)
    if (mFn?.[1]) defaultExportName = mFn[1]

    const mNamed = s.match(/export\s+default\s+(\w+)\s*;?/)
    if (!defaultExportName && mNamed?.[1]) defaultExportName = mNamed[1]
    const hasAnonymousDefaultExport = /export\s+default\s+/.test(s) && !defaultExportName

    s = s.replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
    s = s.replace(/export\s+default\s+(\w+)\s*;?/g, '')
    s = s.replace(/export\s+function\s+/g, 'function ')
    s = s.replace(/export\s+\{[\s\S]*?\};?/g, '')

    if (defaultExportName) {
      s += `\nconst __GenuiComponent = ${defaultExportName};\nwindow.__GenuiComponent = __GenuiComponent;\n`
    } else if (hasAnonymousDefaultExport) {
      // Handle anonymous default exports like: export default () => <div />
      s = s.replace(/export\s+default\s+/, 'const __GenuiComponent = ')
      s += '\nwindow.__GenuiComponent = __GenuiComponent;\n'
    }

    return s.trim()
  }

  const iframeSrcDoc = useMemo(() => {
    const safeCode = toPreviewSource(code)
    const iframeBg = isDark ? '#0b0b0f' : '#ffffff'
    const iframeColor = isDark ? '#ffffff' : '#111827'
    const noComponentClass = isDark ? 'text-sm text-zinc-300' : 'text-sm text-zinc-600'
    const initialHintColor = isDark ? '#a1a1aa' : '#52525b'
    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>body{margin:0;padding:16px;background:${iframeBg};color:${iframeColor};font-family:ui-sans-serif,system-ui;}</style>
  </head>
  <body>
    <div id="root" style="padding:12px;color:${initialHintColor};font-size:14px;">Loading preview...</div>
    <script>
      const source = ${JSON.stringify(safeCode)};
      const mount = document.getElementById('root');
      try {
        if (!window.PropTypes) {
          const mk = () => {
            const checker = () => null;
            checker.isRequired = () => null;
            return checker;
          };
          window.PropTypes = {
            array: mk(), bool: mk(), func: mk(), number: mk(), object: mk(), string: mk(),
            symbol: mk(), node: mk(), element: mk(), any: mk(), instanceOf: () => mk(),
            oneOf: () => mk(), oneOfType: () => mk(), arrayOf: mk(), objectOf: mk(),
            shape: () => mk(), exact: () => mk(),
          };
        }
        const transformed = Babel.transform(source, {
          filename: 'Component.tsx',
          presets: [
            // Babel preset-typescript removed the isTSX/allExtensions options.
            // Since we pass filename=Component.tsx, JSX parsing will still work.
            ['typescript'],
            // Force classic runtime so Babel does not emit jsx-runtime module imports.
            ['react', { runtime: 'classic' }],
          ],
        }).code;
        // eslint-disable-next-line no-eval
        eval(transformed);

        const Guess = window.__GenuiComponent || null;
        const el = Guess
          ? React.createElement(Guess)
          : React.createElement(
              'div',
              {
                className: ${JSON.stringify(noComponentClass)},
                style: { padding: '12px', border: '1px solid rgba(127,127,127,.35)', borderRadius: '10px' }
              },
              'No component found. Ask AI to export a default React component.'
            );
        mount.innerHTML = '';
        ReactDOM.createRoot(mount).render(el);
      } catch (err) {
        mount.style.whiteSpace = 'pre-wrap';
        mount.style.padding = '12px';
        mount.style.color = '#fca5a5';
        mount.textContent = 'Preview error: ' + String(err && err.message ? err.message : err);
      }
    </script>
  </body>
</html>`
  }, [code, isDark])
  async function onGenerate(action) {
    const res = await dispatch(generateComponent({ prompt, action, code }))
      .unwrap()
      .catch(() => null)
    const nextCode = res?.code
    if (typeof nextCode === 'string' && nextCode.trim()) {
      dispatch(addHistoryItem({ prompt, code: nextCode }))
    }
  }

  return (
    <div className={isDark ? 'min-h-full bg-zinc-950 text-white' : 'min-h-full bg-zinc-50 text-zinc-900'}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className={`text-sm ${mutedClass}`}>GenUI</div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI React Component Generator</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" theme={theme} onClick={() => dispatch(toggleTheme())}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </Button>
          </div>
        </header>

        {backendOnline === false ? (
          <div
            className={
              isDark
                ? 'mt-4 rounded-xl bg-amber-500/10 ring-1 ring-inset ring-amber-500/30 p-3 text-sm text-amber-100'
                : 'mt-4 rounded-xl bg-amber-500/10 ring-1 ring-inset ring-amber-500/30 p-3 text-sm text-amber-900'
            }
          >
            Backend is offline. From the project folder run{' '}
            <code className="font-mono text-xs">npm run dev</code> to start backend and frontend together.
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5">
            <div className={panelClass}>
              <div className="flex items-center justify-between">
                <h2 className={`text-sm font-semibold ${cardTitleClass}`}>Prompt</h2>
                <div className={`text-xs ${mutedClass}`}>{prompt.trim().length} chars</div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => dispatch(setPrompt(e.target.value))}
                placeholder='e.g., "Create a responsive pricing card with 3 plans"'
                className={textareaClass}
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button theme={theme} disabled={!canGenerate} onClick={() => onGenerate('generate')}>
                  {loading ? 'Generating…' : 'Generate'}
                </Button>
                <Button
                  variant="secondary"
                  theme={theme}
                  disabled={!code.trim() || loading}
                  onClick={() => onGenerate('regenerate')}
                >
                  Regenerate
                </Button>
                <Button
                  variant="secondary"
                  theme={theme}
                  disabled={!code.trim() || loading}
                  onClick={() => onGenerate('improve')}
                >
                  Improve
                </Button>
                <Button
                  variant="secondary"
                  theme={theme}
                  disabled={!code.trim() || loading}
                  onClick={() => onGenerate('convert_ts')}
                >
                  Convert TS
                </Button>
                <Button
                  variant="secondary"
                  theme={theme}
                  disabled={!code.trim()}
                  onClick={() => navigator.clipboard?.writeText(code || '')}
                >
                  Copy
                </Button>
                <Button
                  variant="secondary"
                  theme={theme}
                  disabled={!code.trim()}
                  onClick={() => downloadText('Component.jsx', code || '')}
                >
                  Download
                </Button>
              </div>

              <div className="mt-4">
                <Button
                  variant="secondary"
                  theme={theme}
                  size="sm"
                  disabled={!code.trim() || loading}
                  onClick={() => onGenerate('explain')}
                  className="w-full"
                >
                  Explain code
                </Button>
                {explanation ? (
                  <div className={explanationClass}>
                    {explanation}
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className={errorClass}>
                  {error}
                </div>
              ) : null}
            </div>

            <div className={`mt-6 ${panelClass}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-sm font-semibold ${cardTitleClass}`}>History</h2>
                <div className={`text-xs ${mutedClass}`}>{items.length} saved</div>
              </div>
              <div className="mt-3 space-y-2 max-h-[340px] overflow-auto pr-1">
                {items.length === 0 ? (
                  <div className={`text-sm ${mutedClass}`}>No history yet.</div>
                ) : (
                  items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => {
                        dispatch(setPrompt(it.prompt))
                        dispatch(setCode(it.code))
                      }}
                      className={historyItemClass}
                    >
                      <div className={`text-xs ${mutedClass}`}>
                        {new Date(it.createdAt).toLocaleString()}
                      </div>
                      <div className={`mt-1 text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'} line-clamp-2`}>
                        {it.prompt}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="lg:col-span-7">
            <div className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <h2 className={`text-sm font-semibold ${cardTitleClass}`}>Output</h2>
                <Tabs
                  value={tab}
                  onChange={setTab}
                  theme={theme}
                  tabs={[
                    { value: 'code', label: 'Code' },
                    { value: 'preview', label: 'Preview' },
                  ]}
                />
              </div>

              <div className="mt-4">
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className={`h-4 ${skeletonBgClass} rounded`} />
                    <div className={`h-4 ${skeletonBgClass} rounded w-11/12`} />
                    <div className={`h-4 ${skeletonBgClass} rounded w-10/12`} />
                    <div className={`h-4 ${skeletonBgClass} rounded w-9/12`} />
                    <div className={`h-4 ${skeletonBgClass} rounded w-8/12`} />
                  </div>
                ) : tab === 'code' ? (
                  <CodeBlock code={code || (isDark ? defaultStarterCodeDark : defaultStarterCodeLight)} language="jsx" theme={theme} />
                ) : (
                  <div className={isDark ? 'rounded-xl overflow-hidden ring-1 ring-inset ring-white/10 bg-zinc-950/40' : 'rounded-xl overflow-hidden ring-1 ring-inset ring-black/10 bg-white'}>
                    <iframe
                      title="preview"
                      sandbox="allow-scripts allow-same-origin"
                      className="w-full h-[520px] bg-transparent"
                      srcDoc={iframeSrcDoc}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

const defaultStarterCodeDark = `export default function Component() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-sm text-zinc-400">Try a prompt like:</div>
      <div className="mt-2 text-lg font-semibold text-white">"Create a responsive pricing card with 3 plans"</div>
      <div className="mt-4 text-sm text-zinc-300">Then click Generate.</div>
    </div>
  )
}
`

const defaultStarterCodeLight = `export default function Component() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="text-sm text-zinc-600">Try a prompt like:</div>
      <div className="mt-2 text-lg font-semibold text-zinc-900">"Create a responsive pricing card with 3 plans"</div>
      <div className="mt-4 text-sm text-zinc-500">Then click Generate.</div>
    </div>
  )
}
`

