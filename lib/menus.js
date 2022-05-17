import { FiBox, FiHardDrive } from 'react-icons/fi'
import { AiOutlineTrophy } from 'react-icons/ai'
import { BiServer, BiFileBlank, BiMessageDots, BiCoinStack } from 'react-icons/bi'
import { RiRadioButtonLine, RiKeyLine } from 'react-icons/ri'
import { MdOutlineHowToVote, MdOutlineSwapHorizontalCircle } from 'react-icons/md'
import { HiCode } from 'react-icons/hi'

export const navigations = [
  {
    id: 'validators',
    title: 'Validators',
    path: '/validators',
    icon: <BiServer size={16} className="stroke-current" />,
  },
  {
    id: 'evm_votes',
    title: 'EVM Votes',
    path: '/evm-votes',
    icon: <MdOutlineHowToVote size={16} className="stroke-current" />,
  },
  {
    id: 'blocks',
    title: 'Blocks',
    path: '/blocks',
    icon: <FiBox size={16} className="stroke-current" />,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    path: '/transactions',
    icon: <BiFileBlank size={16} className="stroke-current -mr-0.5" />,
  },
  {
    id: 'participations',
    title: 'Participations',
    path: '/participations',
    icon: <RiKeyLine size={16} className="stroke-current" />,
  },
  {
    id: 'gmp',
    title: 'GMP',
    path: '/gmp',
    icon: <BiMessageDots size={16} className="stroke-current" />,
  },
  /*{
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    icon: <MdOutlineSwapHorizontalCircle size={16} className="stroke-current" />,
  },*/
  {
    id: 'assets',
    title: 'Assets',
    path: '/assets',
    icon: <BiCoinStack size={16} className="stroke-current -mr-0.5" />,
  },
]

export const networks = [
  {
    id: 'mainnet',
    title: 'Mainnet',
    icon: <RiRadioButtonLine size={20} className="stroke-current" />,
    url: process.env.NEXT_PUBLIC_SITE_URL?.replace('testnet.', ''),
  },
  {
    id: 'testnet',
    title: 'Testnet',
    icon: <HiCode size={20} className="stroke-current" />,
    url: process.env.NEXT_PUBLIC_SITE_URL?.replace('staging.', '').replace('://', `://${process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet' ? 'testnet.' : ''}`),
  },
]

export const leaderboardNavigations = [
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    path: '/validators/leaderboard',
    icon: <AiOutlineTrophy size={16} className="stroke-current" />,
  },
  {
    id: 'snapshots',
    title: 'Snapshots',
    path: '/validators/snapshots',
    icon: <FiHardDrive size={16} className="stroke-current" />,
  },
]
