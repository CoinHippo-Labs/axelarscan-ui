import Link from 'next/link'
import { BiCode, BiTransfer, BiMessageDots } from 'react-icons/bi'

import Transfers from '../transfers/transfers'
import Gmps from '../gmps/gmps'

export default () => {
  return (
    <div className="mb-6 mx-auto">
      <div className="space-y-8">
        <div className="space-y-3">
          <Link href="/transfers/search">
            <a className="flex items-center space-x-2">
              <BiCode
                size={20}
              />
              <span className="uppercase tracking-wider text-base font-semibold">
                Cross-chain transfers
              </span>
            </a>
          </Link>
          <Transfers />
        </div>
        <div className="space-y-3">
          <Link href="/gmp/search">
            <a className="flex items-center space-x-2">
              <BiMessageDots
                size={20}
              />
              <span className="uppercase tracking-wider text-base font-semibold">
                General Message Passing
              </span>
            </a>
          </Link>
          <Gmps />
        </div>
      </div>
    </div>
  )
}