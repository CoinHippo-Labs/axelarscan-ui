export default [
  {
    id: 'validators',
    title: 'Validators',
    path: '/validators',
    others_paths: [
      '/validators/[status]',
      '/validator/[address]',
    ],
  },
  {
    id: 'evm_polls',
    title: 'EVM polls',
    path: '/evm-polls',
  },
  {
    id: 'blocks',
    title: 'Blocks',
    path: '/blocks',
    others_paths: ['/block/[height]'],
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
  [process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS, process.env.NEXT_PUBLIC_SUPPORT_GMP].includes('true') &&
  {
    id: 'interchain-transfers',
    title: 'interchain Transfers',
    path: '/interchain-transfers',
    others_paths: [
      '/transfers',
      '/transfers/search',
      '/transfer/[tx]',
      '/gmp/search',
      '/gmp',
      '/gmp/stats',
      '/gmp/contracts',
      '/gmp/[tx]',
    ],
  },
  process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' && false &&
  {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    others_paths: [
      '/transfers/search',
      '/transfer/[tx]',
    ],
  },
  process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true' && false &&
  {
    id: 'gmp',
    title: 'GMP',
    path: '/gmp/search',
    others_paths: [
      '/gmp',
      '/gmp/stats',
      '/gmp/contracts',
      '/gmp/[tx]',
    ],
  },
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet' &&
  {
    id: 'tvl',
    title: 'TVL',
    path: '/tvl',
  },
  [process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS, process.env.NEXT_PUBLIC_SUPPORT_GMP].includes('true') &&
  {
    id: 'batches',
    title: 'Batches',
    path: '/batches',
    others_paths: ['/batch/[chain]/[id]'],
  },
  [process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS, process.env.NEXT_PUBLIC_SUPPORT_GMP].includes('true') &&
  {
    id: 'assets',
    title: 'Assets',
    path: '/assets',
  },
]
.filter(m => m?.path)