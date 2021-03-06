import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import Image from '../../image'

export default () => {
  const { status } = useSelector(state => ({ status: state.status }), shallowEqual)
  const { status_data } = { ...status }

  return (
    <div className="logo ml-3 mr-1 sm:mr-3">
      <Link href="/">
        <a className="w-full flex items-start">
          <div className="min-w-max sm:mr-3">
            <div className="flex dark:hidden items-center">
              <Image
                src="/logos/logo.png"
                alt=""
                className="w-8 h-8"
              />
            </div>
            <div className="hidden dark:flex items-center">
              <Image
                src="/logos/logo_white.png"
                alt=""
                className="w-8 h-8"
              />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="normal-case text-base font-semibold">
              {process.env.NEXT_PUBLIC_APP_NAME}
            </div>
            {status_data?.chain_id && (
              <div className="max-w-min bg-slate-100 dark:bg-slate-800 rounded whitespace-nowrap text-2xs font-medium pb-0.5 px-1.5 mt-0.5">
                {status_data.chain_id}
              </div>
            )}
          </div>
        </a>
      </Link>
    </div>
  )
}