const routes = [
  { pathname: '/' },
  { pathname: '/validators' },
  { pathname: '/validators/[status]' },
  { pathname: '/validator/[address]' },
  { pathname: '/account/[address]' },
  { pathname: '/evm-votes' },
  { pathname: '/blocks' },
  { pathname: '/block/[height]' },
  { pathname: '/transactions' },
  { pathname: '/transactions/search' },
  { pathname: '/tx/[tx]' },
  { pathname: '/participations' },
  { pathname: '/gmp' },
  { pathname: '/gmp/[tx]' },
  { pathname: '/transfers' },
  { pathname: '/transfer/[tx]' },
  { pathname: '/assets' },
  { pathname: '/proposals' },
  { pathname: '/proposal/[id]' },
]

export const is_route_exist = pathname => routes.findIndex((route, i) => {
  if (route.pathname === pathname) return true
  if (route.pathname.split('/').filter(p => p).length === pathname.split('/').filter(p => p).length) {
    const routePathnameSplit = route.pathname.split('/').filter(p => p)
    const pathnameSplit = pathname.split('/').filter(p => p)
    return !(routePathnameSplit.findIndex((p, j) => !(p.startsWith('[') && p.endsWith(']')) && p !== pathnameSplit[j]) > -1)
  }
  return false
}) > -1