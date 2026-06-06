export function Button({ variant = 'primary', size = 'md', theme = 'dark', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  }

  const isDark = theme === 'dark'
  const secondary = isDark
    ? 'bg-white/10 text-white hover:bg-white/15 ring-1 ring-inset ring-white/10'
    : 'bg-black/5 text-zinc-900 hover:bg-black/10 ring-1 ring-inset ring-black/10'
  const ghost = isDark ? 'text-zinc-200 hover:bg-white/10' : 'text-zinc-700 hover:bg-black/5'

  const variants = {
    primary: 'bg-violet-600 text-white hover:bg-violet-500',
    secondary,
    ghost,
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  }

  return (
    <button
      className={[base, sizes[size] || sizes.md, variants[variant] || variants.primary, className].join(' ')}
      {...props}
    />
  )
}

