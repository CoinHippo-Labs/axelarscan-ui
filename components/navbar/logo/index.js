import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import Chains from '../chains'
import Image from '../../image'

export default () => {
  const {
    status,
  } = useSelector(state =>
    (
      {
        status: state.status,
      }
    ),
    shallowEqual,
  )
  const {
    status_data,
  } = { ...status }
  const {
    chain_id,
  } = { ...status_data }

  return (
    <div className="logo ml-3 mr-1 sm:mr-3">
      <div className="w-full flex items-start">
        <Link href="/">
          <a className="min-w-max sm:mr-3">
            <div className="block dark:hidden">
              <Image
                src="/logos/logo.png"
                className="w-6 sm:w-8 h-6 sm:h-8"
              />
            </div>
            <div className="hidden dark:block">
              <Image
                src="/logos/logo_white.png"
                className="w-6 sm:w-8 h-6 sm:h-8"
              />
            </div>
          </a>
        </Link>
        <div className="hidden sm:block">
          <Link href="/">
            <a className="uppercase text-base font-extrabold">
              {process.env.NEXT_PUBLIC_APP_NAME}
            </a>
          </Link>
          {
            chain_id &&
            (
              <Chains />
            )
          }
        </div>
      </div>
    </div>
  )
}