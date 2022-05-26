import { FiBox } from 'react-icons/fi'
import { BiServer, BiFileBlank, BiMessageDots, BiCode, BiCoinStack } from 'react-icons/bi'
import { RiKeyLine } from 'react-icons/ri'
import { MdOutlineHowToVote } from 'react-icons/md'

export default = [
  {
    id: 'validators',
    title: 'Validators',
    path: '/validators',
    icon: <BiServer size={20} className="stroke-current" />,
  },
  {
    id: 'evm_votes',
    title: 'EVM Votes',
    path: '/evm-votes',
    icon: <MdOutlineHowToVote size={20} className="stroke-current" />,
  },
  {
    id: 'blocks',
    title: 'Blocks',
    path: '/blocks',
    icon: <FiBox size={20} className="stroke-current" />,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    path: '/transactions',
    icon: <BiFileBlank size={20} className="stroke-current" />,
  },
  {
    id: 'participations',
    title: 'Participations',
    path: '/participations',
    icon: <RiKeyLine size={20} className="stroke-current" />,
  },
  {
    id: 'gmp',
    title: 'GMP',
    path: '/gmp',
    icon: <BiMessageDots size={20} className="stroke-current" />,
  },
  {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    icon: <BiCode size={20} className="stroke-current" />,
  },
  {
    id: 'assets',
    title: 'Assets',
    path: '/assets',
    icon: <BiCoinStack size={20} className="stroke-current" />,
  },
].filter(m => process.env.NEXT_PUBLIC_GMP_API_URL || !['gmp', 'transfers', 'assets'].includes(m?.id))