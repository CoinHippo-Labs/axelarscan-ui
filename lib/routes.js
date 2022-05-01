const routes = [
  { pathname: '/' },
  { pathname: '/validators' },
  { pathname: '/validators/[status]' },
  { pathname: '/validators/leaderboard' },
  { pathname: '/validators/snapshots' },
  { pathname: '/validators/snapshot/[height]' },
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
  { pathname: '/assets' },
  { pathname: '/proposals' },
  { pathname: '/proposal/[id]' },
]

export const isMatchRoute = pathname => {
  return routes.findIndex((route, i) => {
    if (route.pathname === pathname) {
      return true
    }
    else if (route.pathname.split('/').filter(path => path).length === pathname.split('/').filter(path => path).length) {
      const routePathnameSplit = route.pathname.split('/').filter(path => path)
      const pathnameSplit = pathname.split('/').filter(path => path)

      return routePathnameSplit.findIndex((path, j) => !(path.startsWith('[') && path.endsWith(']')) && path !== pathnameSplit[j]) > -1 ? false : true
    }
    else {
      return false
    }
  }) > -1
}