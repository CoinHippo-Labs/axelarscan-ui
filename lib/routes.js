const routes = [
  { pathname: '/' },
  { pathname: '/validators' },
  { pathname: '/validators/[status]' },
  { pathname: '/validators/tier' },
  { pathname: '/validator/[address]' },
  { pathname: '/account/[address]' },
  { pathname: '/evm-votes' },
  { pathname: '/participations' },
  { pathname: '/blocks' },
  { pathname: '/block/[height]' },
  { pathname: '/transactions' },
  { pathname: '/transactions/search' },
  { pathname: '/tx/[tx]' },
  { pathname: '/address/[address]' },
  { pathname: '/transfers' },
  { pathname: '/transfers/search' },
  { pathname: '/transfer/[tx]' },
  { pathname: '/sent' },
  { pathname: '/sent/search' },
  { pathname: '/sent/[tx]' },
  { pathname: '/gmp' },
  { pathname: '/gmp/search' },
  { pathname: '/gmp/[tx]' },
  { pathname: '/batches' },
  { pathname: '/batch/[chain]/[id]' },
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