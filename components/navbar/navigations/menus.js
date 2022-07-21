import { FiBox, FiCode } from 'react-icons/fi'
import { BiServer, BiFileBlank, BiMessageDots, BiCoinStack, BiCircle } from 'react-icons/bi'
import { RiKeyLine, RiStackLine } from 'react-icons/ri'
import { MdOutlineHowToVote } from 'react-icons/md'

export default [
  {
    id: 'validators',
    title: 'Validators',
    path: '/validators',
    others_paths: ['/validators/[status]', '/validators/tier', '/validator/[address]'],
    icon: <BiServer size={18} className="stroke-current" />,
  },
  {
    id: 'evm_votes',
    title: 'Votes',
    path: '/evm-votes',
    icon: <MdOutlineHowToVote size={18} className="stroke-current" />,
  },
  {
    id: 'blocks',
    title: 'Blocks',
    path: '/blocks',
    others_paths: ['/block/[height]'],
    icon: <FiBox size={18} className="stroke-current" />,
  },
  {
    id: 'transactions',
    title: 'TXs',
    path: '/transactions',
    others_paths: ['/transactions/search', '/tx/[tx]'],
    icon: <BiFileBlank size={18} className="stroke-current" />,
  },
  {
    id: 'participations',
    title: 'Keygen',
    path: '/participations',
    icon: <RiKeyLine size={18} className="stroke-current" />,
  },
  process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' && {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    others_paths: ['/transfers/search', '/transfer/[tx]'],
    icon: <FiCode size={18} className="stroke-current" />,
  },
  process.env.NEXT_PUBLIC_SUPPORT_TOKEN_SENT === 'true' && {
    id: 'sent',
    title: 'Sent',
    path: '/sent',
    others_paths: ['/sent/search', '/sent/[tx]'],
    icon: <BiCircle size={18} className="stroke-current" />,
  },
  process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true' && {
    id: 'gmp',
    title: 'GMP',
    path: '/gmp',
    others_paths: ['/gmp/search', '/gmp/stats', '/gmp/[tx]'],
    icon: <BiMessageDots size={18} className="stroke-current" />,
  },
  (process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' || process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true') && {
    id: 'batches',
    title: 'Batches',
    path: '/batches',
    others_paths: ['/batch/[chain]/[id]'],
    icon: <RiStackLine size={18} className="stroke-current" />,
  },
  (process.env.NEXT_PUBLIC_SUPPORT_TRANSFERS === 'true' || process.env.NEXT_PUBLIC_SUPPORT_GMP === 'true') && {
    id: 'assets',
    title: 'Assets',
    path: '/assets',
    icon: <BiCoinStack size={18} className="stroke-current" />,
  },
].filter(m => m?.path)