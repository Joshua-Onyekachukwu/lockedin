import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import * as React from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
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
      <AuthGate>
        <Outlet />
      </AuthGate>
    </RootDocument>
  )
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
    structuralSharing: true as any,
  })

  const userQuery = React.useMemo(
    () => convexQuery(api.users.current, {} as any) as any,
    [],
  )

  const { data: user }: { data: any } = useQuery({
    ...(userQuery),
    enabled: isAuthenticated,
    staleTime: 1000 * 20,
  })

  React.useEffect(() => {
    if (authLoading) return

    const allowUnauthed = new Set([
      '/',
      '/login',
      '/signup',
      '/verify-email',
      '/auth/callback',
    ])

    const allowUnverified = new Set([
      '/',
      '/verify-required',
      '/verify-email',
      '/auth/callback',
      '/login',
      '/signup',
    ])

    if (!isAuthenticated) {
      if (!allowUnauthed.has(pathname)) navigate({ to: '/login' })
      return
    }

    const isVerified = !!user?.emailVerificationTime
    if (!isVerified) {
      if (!allowUnverified.has(pathname)) navigate({ to: '/verify-required' })
    }
  }, [authLoading, isAuthenticated, navigate, pathname, user])

  return <>{children}</>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
        <CssAssetBootstrap />
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

function CssAssetBootstrap() {
  return (
    <script
      className="tsr-once"
      dangerouslySetInnerHTML={{
        __html:
          "(function(){try{if(document.querySelector('link[rel=\"stylesheet\"]'))return;var u='/_build/.vite/manifest.json';fetch(u,{cache:'no-store'}).then(function(r){return r.json()}).then(function(m){var e=m['virtual:$vinxi/handler/client'];if(!e&&m){for(var k in m){if(m[k]&&m[k].isEntry){e=m[k];break}}}var css=null;if(e&&e.imports&&e.imports[0]&&m[e.imports[0]]&&m[e.imports[0]].css&&m[e.imports[0]].css[0]){css=m[e.imports[0]].css[0]}if(!css){for(var k2 in m){if(m[k2]&&m[k2].css&&m[k2].css[0]){css=m[k2].css[0];break}}}if(!css)return;var l=document.createElement('link');l.rel='stylesheet';l.href='/_build/'+css.replace(/^\\//,'');l.fetchPriority='high';document.head.appendChild(l)}).catch(function(){});}catch(e){}})();",
      }}
    />
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
        .map((match) => router.looseRoutesById[match.routeId])
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
