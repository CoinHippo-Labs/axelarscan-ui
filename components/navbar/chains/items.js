import Link from 'next/link'
import { BiCheckCircle } from 'react-icons/bi'

import menus from './menus'

export default (
  {
    current,
    onClick,
  },
) => {
  const _menus =
    menus
      .filter(m =>
        !m?.menu_hidden
      )

  return (
    <div
      className="backdrop-blur-16 w-56 shadow dark:shadow-slate-700 rounded-lg flex flex-col"
    >
      {_menus
        .map((m, i) => {
          const {
            id,
            disabled,
            title,
            path,
            external,
          } = { ...m }

          const selected = current === id

          const item =
            (
              <div
                className={`${i === 0 ? 'rounded-t-lg' : i === _menus.length - 1 ? 'rounded-b-lg' : ''} ${selected ? 'font-bold' : 'font-normal'} w-full flex items-center whitespace-nowrap space-x-1 py-2.5 px-3`}
              >
                <span>
                  {title}
                </span>
                {
                  selected &&
                  (
                    <BiCheckCircle
                      size={20}
                      className="text-green-400"
                    />
                  )
                }
              </div>
            )

          return (
            disabled ?
              <div
                key={id}
                title="Disabled"
                className="cursor-not-allowed"
              >
                {item}
              </div> :
              external ?
                <a
                  key={id}
                  href={path}
                  onClick={onClick}
                >
                  {item}
                </a> :
                <Link
                  key={id}
                  href={path}
                >
                  <a onClick={onClick}>
                    {item}
                  </a>
                </Link>
          )
        })
      }
    </div>
  )
}