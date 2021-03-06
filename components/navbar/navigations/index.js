import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'
import { TiArrowRight } from 'react-icons/ti'

import menus from './menus'

export default () => {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="hidden xl:flex items-center space-x-0 xl:space-x-1 mx-auto">
      {menus.filter(m => m?.path).map((m, i) => {
        const item = (
          <>
            {m.icon}
            <span className="whitespace-nowrap">
              {m.title}
            </span>
          </>
        )
        const right_icon = m.emphasize ?
          <HeadShake duration={1500} forever>
            <FaHandPointLeft size={18} />
          </HeadShake> : m.external ?
          <TiArrowRight size={18} className="transform -rotate-45" /> : null
        const className = `bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg ${m.disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase text-black dark:text-white text-xs ${!m.external && (pathname === m.path || m.others_paths?.includes(pathname)) ? 'font-extrabold' : 'font-medium hover:font-bold'} space-x-1 py-2 px-1.5`
        return m.external ?
          <a
            key={i}
            href={m.path}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {item}
            {right_icon}
          </a>
          :
          <Link key={i} href={m.path}>
            <a className={className}>
              {item}
              {right_icon}
            </a>
          </Link>
      })}
    </div>
  )
}