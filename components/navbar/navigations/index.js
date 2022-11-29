import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'

import menus from './menus'

export default () => {
  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  return (
    <div className="hidden xl:flex items-center xl:space-x-6 mx-auto">
      {menus
        .map(m => {
          const {
            id,
            disabled,
            emphasize,
            title,
            path,
            others_paths,
            external,
          } = { ...m }

          const selected =
            !external &&
            (
              pathname === path ||
              others_paths?.includes(pathname)
            )

          const item =
            (
              <span className="whitespace-nowrap tracking-wider">
                {title}
              </span>
            )

          const right_icon =
            emphasize ?
              <HeadShake
                duration={1500}
                forever
              >
                <FaHandPointLeft
                  size={18}
                />
              </HeadShake> :
              undefined

          const className = `${disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase ${selected ? 'text-blue-500 dark:text-blue-500 text-sm font-bold' : 'text-slate-600 hover:text-blue-400 dark:text-slate-300 dark:hover:text-blue-400 text-sm font-normal'} space-x-1`

          return (
            external ?
              <a
                key={id}
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {item}
                {right_icon}
              </a> :
              <Link
                key={id}
                href={path}
              >
                <a className={className}>
                  {item}
                  {right_icon}
                </a>
              </Link>
          )
        })
      }
    </div>
  )
}