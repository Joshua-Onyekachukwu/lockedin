import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import * as React from 'react'
// @ts-ignore
import { Analytics } from '@vercel/analytics/react'
import type { QueryClient } from '@tanstack/react-query'
import '~/styles/app.css'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Lockedin | The Behavioral Bank',
      },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
        <RouterAssetLinks />
      </head>
      <body>
        {children}
        <Scripts />
        <Analytics />
      </body>
    </html>
  )
}

function RouterAssetLinks() {
  const router = useRouter()

  const assetLinks = useRouterState({
    select: (state) => {
      const manifest = router.ssr?.manifest
      if (!manifest) return []

      const links: Array<{ tag: 'link'; attrs: Record<string, any> }> = []

      state.matches
        .map((match) => router.looseRoutesById[match.routeId]!)
        .forEach((route) => {
          manifest.routes[route.id]?.assets
            ?.filter((d: any) => d?.tag === 'link')
            .forEach((asset: any) => {
              links.push(asset)
            })
        })

      return links
    },
    structuralSharing: true as any,
  })

  const uniqLinks = React.useMemo(() => {
    const seen = new Set<string>()
    return assetLinks.filter((l) => {
      const key = JSON.stringify(l)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [assetLinks])

  return uniqLinks.map((l, i) => <link key={`tsr-asset-${i}`} {...l.attrs} />)
}
