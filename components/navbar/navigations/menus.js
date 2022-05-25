import { FiBox } from 'react-icons/fi'
import { BiServer, BiFileBlank, BiMessageDots, BiCode, BiCoinStack } from 'react-icons/bi'
import { RiRadioButtonLine, RiKeyLine } from 'react-icons/ri'
import { MdOutlineHowToVote } from 'react-icons/md'
import { HiCode } from 'react-icons/hi'

export const navigations = [
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
  /*{
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    icon: <BiCode size={20} className="stroke-current" />,
  },*/
  {
    id: 'assets',
    title: 'Assets',
    path: '/assets',
    icon: <BiCoinStack size={20} className="stroke-current" />,
  },
]

export const environments = [
  {
    id: 'mainnet',
    title: 'Mainnet',
    path: process.env.NEXT_PUBLIC_SITE_URL?.replace('testnet.', ''),
    external: true,
    icon: <RiRadioButtonLine size={20} className="stroke-current" />,
  },
  {
    id: 'testnet',
    title: 'Testnet',
    path: process.env.NEXT_PUBLIC_SITE_URL?.replace('staging.', '').replace('://', `://${process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet' ? 'testnet.' : ''}`),
    external: true,
    icon: <HiCode size={20} className="stroke-current" />,
  },
]