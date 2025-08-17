const envTag =
  typeof window !== 'undefined'
    ? (location.host.replace(/\W/g, '') || 'web')
    : 'ssr'
const channel = supabase.channel(`mobius:${envTag}:room:${code}`, {
  config: { presence: { key: nick } },
})
