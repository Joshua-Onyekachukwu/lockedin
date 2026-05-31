export function toUserMessage(err: unknown, fallback: string) {
  const raw =
    typeof err === 'string'
      ? err
      : (err as any)?.data?.message || (err as any)?.message || fallback

  return sanitizeMessage(String(raw || fallback), fallback)
}

export function sanitizeMessage(message: string, fallback: string) {
  let m = message

  if (m.includes('Insufficient capital in wallet')) {
    return 'Insufficient capital in wallet. Top up to proceed.'
  }

  if (m.includes('Authorization Breach: You can only request witnesses for your own protocols.')) {
    return 'Select one of your own protocols to attach to this request.'
  }

  if (m.includes('UNAUTHORIZED') || m.includes('ACCESS DENIED')) {
    return 'Access denied. Please sign in again.'
  }

  m = m.replace(/\[CONVEX[^\]]*\]\s*/g, '')
  m = m.replace(/\[Request ID:[^\]]*\]\s*/g, '')
  m = m.replace(/^Server Error\s*/i, '')
  m = m.replace(/^Uncaught Error:\s*/i, '')
  m = m.replace(/^Error:\s*/i, '')

  const match = m.match(/Insufficient capital in wallet/i)
  if (match) return 'Insufficient capital in wallet. Top up to proceed.'

  m = m.trim()
  if (!m) return fallback
  if (m.length > 160) return `${m.slice(0, 157)}...`
  return m
}

