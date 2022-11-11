export default [
  {
    id: 'validators',
    title: 'Validators',
    path: '/validators',
    others_paths: [
      '/validators/[status]',
      '/validators/tier',
      '/validator/[address]',
    ],
  },
  /*{
    id: 'evm_votes',
    title: 'EVM votes',
    path: '/evm-votes',
  },*/
  {
    id: 'evm_polls',
    title: 'EVM polls',
    path: '/evm-polls',
  },
  {
    id: 'blocks',
    title: 'Blocks',
    path: '/blocks',
    others_paths: [
      '/block/[height]',
    ],
  },
  {
    id: 'transactions',
    title: 'Transactions',
    path: '/transactions/search',
    others_paths: [
      '/transactions',
      '/tx/[tx]',
    ],
  },
  /*{
    id: 'participations',
    title: 'Keygen',
    path: '/participations',
  },*/
  process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' && {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    others_paths: [
      '/transfers/search',
      '/transfer/[tx]',
    ],
  },
  process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true' && {
    id: 'gmp',
    title: 'GMP',
    path: '/gmp/search',
    others_paths: [
      '/gmp',
      '/gmp/stats',
      '/gmp/[tx]',
    ],
  },
  process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' && {
    id: 'tvl',
    title: 'TVL',
    path: '/tvl',
  },
  (
    process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' ||
    process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true'
  ) && {
    id: 'batches',
    title: 'Batches',
    path: '/batches',
    others_paths: [
      '/batch/[chain]/[id]',
    ],
  },
  (
    process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' ||
    process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true'
  ) && {
    id: 'assets',
    title: 'Assets',
    path: '/assets',
  },
].filter(m => m?.path)