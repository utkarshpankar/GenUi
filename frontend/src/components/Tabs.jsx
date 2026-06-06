export function Tabs({ value, onChange, tabs, theme = 'dark' }) {
  const isDark = theme === 'dark'

  const wrapper = isDark
    ? 'inline-flex rounded-lg bg-white/5 ring-1 ring-inset ring-white/10 p-1'
    : 'inline-flex rounded-lg bg-black/5 ring-1 ring-inset ring-black/10 p-1'

  return (
    <div className={wrapper}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={[
              'h-9 px-3 rounded-md text-sm font-medium transition',
              active
                ? isDark
                  ? 'bg-white/10 text-white'
                  : 'bg-black/10 text-zinc-900'
                : isDark
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-zinc-600 hover:text-zinc-900',
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

