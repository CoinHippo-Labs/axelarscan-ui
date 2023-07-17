import Link from 'next/link'

const ENVIRONMENTS = [
  { id: 'mainnet', url: 'https://axelarscan.io' },
  { id: 'testnet', url: 'https://testnet.axelarscan.io' },
]

export default ({ onClick }) => {
  return (
    <div className="flex flex-col py-1">
      {ENVIRONMENTS.map((d, i) => {
        const { id, url } = { ...d }
        const selected = id === process.env.NEXT_PUBLIC_ENVIRONMENT
        const item = (
          <span className="whitespace-nowrap tracking-wider capitalize">
            {id}
          </span>
        )
        const className = `w-full flex items-center uppercase ${selected ? 'text-blue-600 dark:text-white text-sm font-extrabold' : 'text-slate-700 hover:text-blue-400 dark:text-slate-200 dark:hover:text-slate-100 text-sm font-medium'} space-x-1.5 py-1 px-3`
        return (
          <Link key={i} href={url}>
            <div onClick={onClick} className={className}>
              {item}
            </div>
          </Link>
        )
      })}
    </div>
  )
}