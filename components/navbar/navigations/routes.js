import { toArray } from '../../../lib/utils'

export default toArray([
  {
    title: 'Overview',
    path: '/interchain',
    others_paths: ['/interchain-transfers'],
    group: 'interchain',
  },
  {
    title: 'General Message Passing',
    path: '/gmp/search',
    others_paths: ['/gmp', '/gmp/[tx]'],
    group: 'interchain',
  },
  {
    title: 'Token Transfers',
    path: '/transfers/search',
    others_paths: ['/transfers', '/transfer/[tx]', '/transfers/[tx]'],
    group: 'interchain',
  },
  {
    title: 'Validators',
    path: '/validators',
    others_paths: ['/validators/[status]', '/validator/[address]'],
  },
  {
    title: 'Blocks',
    path: '/blocks',
    others_paths: ['/block/[height]', '/blocks/[height]'],
    group: 'axelar',
  },
  {
    title: 'Transactions',
    path: '/transactions/search',
    others_paths: ['/transactions', '/txs/search', '/txs', '/tx/[tx]', '/transactions/[tx]', '/txs/[tx]', '/transaction/[tx]'],
    group: 'axelar',
  },
  {
    title: 'EVM Polls',
    path: '/evm-polls',
    others_paths: ['/polls', '/evm-poll/[id]', '/poll/[id]', '/evm-polls/[id]', '/polls/[id]'],
    group: 'axelar',
  },
  {
    title: 'EVM Batches',
    path: '/evm-batches',
    others_paths: ['/batches', '/evm-batch/[chain]/[id]', '/batch/[chain]/[id]', '/evm-batches/[chain]/[id]', '/batches/[chain]/[id]'],
    group: 'axelar',
  },
  {
    title: 'Proposals',
    path: '/proposals',
    others_paths: ['/proposals/[id]', '/proposal/[id]'],
    group: 'axelar',
  },
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet' && {
    title: 'TVL',
    path: '/tvl',
  },
  {
    title: 'Resources',
    path: '/resources',
    others_paths: ['/resources/[by]', '/assets'],
  },
])