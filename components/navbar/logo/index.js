import Link from 'next/link'

import Environment from '../environment'
import Image from '../../image'

export default () => {
  return (
    <div className="logo ml-3 mr-1.5 sm:mr-3">
      <div className="w-full flex items-center">
        <Link href="/" className="min-w-max sm:mr-3">
          <div className="block dark:hidden">
            <Image
              src="/logos/logo.png"
              width={24}
              height={24}
              className="w-6 sm:w-8 h-6 sm:h-8"
            />
          </div>
          <div className="hidden dark:block">
            <Image
              src="/logos/logo_white.png"
              width={24}
              height={24}
              className="w-6 sm:w-8 h-6 sm:h-8"
            />
          </div>
        </Link>
        <div className="hidden sm:block">
          <Link href="/" className="uppercase text-base 3xl:text-lg font-extrabold">
            {process.env.NEXT_PUBLIC_APP_NAME}
          </Link>
          <Environment />
        </div>
      </div>
    </div>
  )
}