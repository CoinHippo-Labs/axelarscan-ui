import Link from 'next/link'

import menus from './menus'

export default ({ onClick }) => {
  return (
    <>
      <div className="dropdown-title">
        Select Environment
      </div>
      <div className="flex flex-wrap pb-1">
        {menus.filter(e => !e.menu_hidden).map((e, i) => {
          const item = (
            <>
              {e.icon}
              <span className="leading-4 text-xs font-medium">
                {e.title}
              </span>
            </>
          )
          return e.disabled ?
            <div
              key={i}
              title="Disabled"
              className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start font-medium space-x-1.5 p-2"
            >
              {item}
            </div>
            :
            e.external ?
              <a
                key={i}
                href={e.path}
                onClick={onClick}
                className="dropdown-item w-1/2 flex items-center justify-start space-x-1.5 p-2"
              >
                {item}
              </a>
              :
              <Link key={i} href={`/${e.id}`}>
                <a
                  onClick={onClick}
                  className="dropdown-item w-1/2 flex items-center justify-start space-x-1.5 p-2"
                >
                  {item}
                </a>
              </Link>
        })}
      </div>
    </>
  )
}