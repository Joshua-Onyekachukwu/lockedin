import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { getFullRouterManifest } from '@tanstack/react-start/router-manifest'
import { getRouter } from './router'

export default createStartHandler({
  createRouter: getRouter,
  getRouterManifest: getFullRouterManifest,
})(defaultStreamHandler)
