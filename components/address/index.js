import Link from 'next/link'
import { FiCode } from 'react-icons/fi'
import { BiMessageDots } from 'react-icons/bi'

import Transfers from '../transfers/transfers'
import Gmps from '../gmp/gmps'

export default () => {
  return (
    <div className="space-y-8 mb-6 mx-auto pb-10">
      <div className="space-y-6">
        <div className="space-y-3">
          <Link href="/transfers/search">
            <a className="flex items-center space-x-2">
              <FiCode size={20} />
              <span className="uppercase text-base font-bold">
                Cross-chain transfers
              </span>
            </a>
          </Link>
          <Transfers />
        </div>
        <div className="space-y-3">
          <Link href="/gmp/search">
            <a className="flex items-center space-x-2">
              <BiMessageDots size={20} />
              <span className="uppercase text-base font-bold">
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