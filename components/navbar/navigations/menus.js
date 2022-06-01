import { FiBox, FiCode } from 'react-icons/fi'
import { BiServer, BiFileBlank, BiMessageDots, BiCoinStack } from 'react-icons/bi'
import { RiKeyLine, RiStackLine } from 'react-icons/ri'
import { MdOutlineHowToVote } from 'react-icons/md'

export default [
  {
    id: 'validators',
    title: 'Validators',
    path: '/validators',
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
    icon: <FiBox size={18} className="stroke-current" />,
  },
  {
    id: 'transactions',
    title: 'TXs',
    path: '/transactions',
    icon: <BiFileBlank size={18} className="stroke-current" />,
  },
  {
    id: 'participations',
    title: 'Keygen',
    path: '/participations',
    icon: <RiKeyLine size={18} className="stroke-current" />,
  },
  {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    icon: <FiCode size={18} className="stroke-current" />,
  },
  {
    id: 'gmp',
    title: 'GMP',
    path: '/gmp',
    icon: <BiMessageDots size={18} className="stroke-current" />,
  },
  {
    id: 'batches',
    title: 'Batches',
    path: '/batches',
    icon: <RiStackLine size={18} className="stroke-current" />,
  },
  {
    id: 'assets',
    title: 'Assets',
    path: '/assets',
    icon: <BiCoinStack size={18} className="stroke-current" />,
  },
].filter(m => process.env.NEXT_PUBLIC_GMP_API_URL || !['gmp', 'transfers', 'assets'].includes(m?.id))