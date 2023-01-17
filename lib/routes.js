export const routes =
  [
    { pathname: '/' },
    { pathname: '/validators' },
    { pathname: '/validators/[status]' },
    { pathname: '/validators/tier' },
    { pathname: '/validator/[address]' },
    { pathname: '/account/[address]' },
    { pathname: '/evm-polls' },
    { pathname: '/evm-poll/[id]' },
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
    { pathname: '/transfer' },
    { pathname: '/_transfers/search' },
    { pathname: '/_transfer/[tx]' },
    { pathname: '/_transfer' },
    { pathname: '/tvl' },
    { pathname: '/sent' },
    { pathname: '/sent/search' },
    { pathname: '/sent/[tx]' },
    { pathname: '/gmp' },
    { pathname: '/gmp/search' },
    { pathname: '/gmp/stats' },
    { pathname: '/gmp/contracts' },
    { pathname: '/gmp/[tx]' },
    { pathname: '/batches' },
    { pathname: '/batch/[chain]/[id]' },
    { pathname: '/assets' },
    { pathname: '/proposals' },
    { pathname: '/proposal/[id]' },
  ]

export const is_route_exist = pathname =>
  routes
    .findIndex((r, i) => {
      if (r.pathname === pathname)
        return true

      if (
        r.pathname
          .split('/')
          .filter(p => p)
          .length ===
        pathname
          .split('/')
          .filter(p => p)
          .length
      ) {
        const route_paths =
          r.pathname
            .split('/')
            .filter(p => p)

        const paths =
          pathname
            .split('/')
            .filter(p => p)

        return (
          !(
            route_paths
              .findIndex((p, j) =>
                !(
                  p.startsWith('[') &&
                  p.endsWith(']')
                ) &&
                p !== paths[j]
              ) > -1
          )
        )
      }

      return false
    }) > -1