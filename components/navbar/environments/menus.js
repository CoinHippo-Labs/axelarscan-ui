import { RiRadioButtonLine } from 'react-icons/ri'
import { HiCode } from 'react-icons/hi'

export default = [
  {
    id: 'mainnet',
    title: 'Mainnet',
    path: process.env.NEXT_PUBLIC_SITE_URL?.replace('testnet.', ''),
    external: true,
    icon: <RiRadioButtonLine size={24} className="stroke-current" />,
  },
  {
    id: 'testnet',
    title: 'Testnet',
    path: process.env.NEXT_PUBLIC_SITE_URL?.replace('staging.', '').replace('://', `://${process.env.NEXT_PUBLIC_ENVIRONMENT === 'mainnet' ? 'testnet.' : ''}`),
    external: true,
    icon: <HiCode size={24} className="stroke-current" />,
  },
]