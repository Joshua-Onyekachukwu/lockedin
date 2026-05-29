import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import { getRouter } from './router'

const router = getRouter()

export default function start() {
  hydrateRoot(document, <StartClient router={router} />)
}

start()
