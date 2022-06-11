import { RiRadioButtonLine } from 'react-icons/ri'
import { HiCode } from 'react-icons/hi'

export default [
  {
    id: 'mainnet',
    title: 'Mainnet',
    path: 'https://axelarscan.io',
    external: true,
    icon: <RiRadioButtonLine size={20} className="stroke-current" />,
  },
  {
    id: 'testnet',
    title: 'Testnet',
    path: 'https://testnet.axelarscan.io',
    external: true,
    icon: <HiCode size={20} className="stroke-current" />,
  },
  {
    id: 'testnet-2',
    title: 'Testnet 2',
    path: 'https://testnet-2.axelarscan.io',
    external: true,
    icon: <HiCode size={20} className="stroke-current" />,
  },
]