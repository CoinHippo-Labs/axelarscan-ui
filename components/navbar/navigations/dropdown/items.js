import Link from 'next/link'
import { useRouter } from 'next/router'
import _ from 'lodash'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'

import menus from '../menus'

export default (
  {
    onClick,
  },
) => {
  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  const _menus =
    _.concat(
      _.head(menus)?.path !== '/' ?
        {
          id: 'dashboard',
          title: 'Dashboard',
          path: '/',
        } :
        [],
      menus,
    )

  return (
    <div
      className="backdrop-blur-16 w-56 shadow dark:shadow-slate-700 rounded-lg flex flex-col py-1"
    >
      {_menus
        .map((m, i) => {
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
                  size={20}
                />
              </HeadShake> :
              undefined

          const className = `w-full ${i === 0 ? 'rounded-t-lg' : i === _menus.length - 1 ? 'rounded-b-lg' : ''} ${disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase ${selected ? 'text-blue-500 dark:text-blue-500 text-sm font-bold' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-normal hover:font-semibold'} space-x-1.5 py-2 px-3`

          return (
            external ?
              <a
                key={id}
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClick}
                className={className}
              >
                {item}
                {right_icon}
              </a> :
              <Link
                key={id}
                href={path}
              >
                <a
                  onClick={onClick}
                  className={className}
                >
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