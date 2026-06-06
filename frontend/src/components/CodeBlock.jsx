import { useEffect, useMemo } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'

function normalize(code) {
  return (code || '').replace(/\r\n/g, '\n')
}

export function CodeBlock({ code, language = 'jsx', theme = 'dark' }) {
  const html = useMemo(() => {
    const c = normalize(code)
    const grammar = Prism.languages[language] || Prism.languages.jsx
    return Prism.highlight(c, grammar, language)
  }, [code, language])

  useEffect(() => {
    Prism.highlightAll()
  }, [code, language])

  const isDark = theme === 'dark'
  const preClass = isDark
    ? 'text-xs leading-5 bg-zinc-950/60 ring-1 ring-inset ring-white/10 rounded-xl overflow-auto p-4'
    : 'text-xs leading-5 bg-white ring-1 ring-inset ring-black/10 text-zinc-900 rounded-xl overflow-auto p-4'

  return (
    <pre className={preClass}>
      <code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}

