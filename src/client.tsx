import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import * as Sentry from '@sentry/react'
import { getRouter } from './router'

const router = getRouter()

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.05,
    beforeSend(event) {
      const req: any = (event as any).request
      if (req?.headers) {
        const headers = { ...req.headers }
        if (headers.Authorization) headers.Authorization = '[redacted]'
        if (headers.authorization) headers.authorization = '[redacted]'
        if (headers.Cookie) headers.Cookie = '[redacted]'
        if (headers.cookie) headers.cookie = '[redacted]'
        ;(event as any).request = { ...req, headers }
      }
      return event
    },
  })
}

export default function start() {
  hydrateRoot(document, <StartClient router={router} />)
}

start()
