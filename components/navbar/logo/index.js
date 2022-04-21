import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import { Img } from 'react-image'

export default function Logo() {
  const { preferences, status } = useSelector(state => ({ preferences: state.preferences, status: state.status }), shallowEqual)
  const { theme } = { ...preferences }
  const { status_data } = { ...status }

  return (
    <div className="logo ml-2.5 mr-1 sm:mx-3">
      <Link href="/">
        <a className="w-full flex items-center">
          <div className="min-w-max sm:mr-3">
            <Img
              src={`/logos/logo${theme === 'dark' ? '_white' : ''}.png`}
              alt=""
              className="w-8 h-8"
            />
          </div>
          <div className="hidden sm:block lg:block xl:block">
            <div className="normal-case text-black dark:text-white text-base font-semibold">{process.env.NEXT_PUBLIC_APP_NAME}</div>
            {status_data?.chain_id && (
              <div className="whitespace-nowrap font-mono text-gray-400 dark:text-gray-500 text-xs">{status_data.chain_id}</div>
            )}
          </div>
        </a>
      </Link>
    </div>
  )
}