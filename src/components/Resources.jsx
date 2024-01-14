'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'

import { Container } from '@/components/Container'
import { useGlobalStore } from '@/app/providers'
import { split, toArray } from '@/lib/parser'
import { includesStringList } from '@/lib/operator'
import { equalsIgnoreCase } from '@/lib/string'

const resources = ['chains', 'assets']

export function Resources({ resource }) {
  const pathname = usePathname()
  const router = useRouter()
  const { chains, assets } = useGlobalStore()

  const [rendered, setRendered] = useState(false)
  const [input, setInput] = useState('')
  const [assetFocusID, setAssetFocusID] = useState(null)

  useEffect(() => {
    switch (pathname) {
      case '/resources':
        router.push(`/resources/${resources[0]}`)
        break
      case '/assets':
        router.push('/resources/assets')
        break
      default:
        if (!rendered) setRendered(true)
        else if (resource) {
          router.push(`/resources/${resource}`)
          setInput('')
          if (resource !== 'assets') setAssetFocusID(null)
        }
        break
    }
  }, [pathname, rendered, setRendered, resource, setInput, setAssetFocusID])

  const filter = resource => {
    const words = split(input, { delimiter: ' ', toCase: 'lower' })
    switch (resource) {
      case 'chains':
        return toArray(chains).filter(d => !d.no_inflation || d.deprecated).filter(d => !input || includesStringList(_.uniq(toArray(['id', 'chain_id', 'chain_name', 'name'].map(f => d[f]?.toString()), { toCase: 'lower' })), words))
      case 'assets':
        return toArray(assets).filter(d => !input || includesStringList(_.uniq(toArray(_.concat(['denom', 'name', 'symbol'].map(f => d[f]), d.denoms, Object.values({ ...d.addresses }).flatMap(a => toArray([!equalsIgnoreCase(input, 'axl') && a.symbol, a.address, a.ibc_denom]))), { toCase: 'lower' })), words))
      default:
        return null
    }
  }

  const render = resource => {
    switch (resource) {
      case 'chains':
        return (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-7 gap-4 xl:gap-6">
            {/*filter(resource).map((d, i) => <ChainCard key={i} data={d} />)*/}
          </div>
        )
      case 'assets':
        return (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-7 gap-4 xl:gap-6">
            {/*filter(resource).map((d, i) => <AssetCard key={i} data={d} focusId={assetFocusID} focus={id => setAssetFocusID(id)} />)*/}
          </div>
        )
      default:
        return <div />
    }
  }

  return rendered && resource && (
    <Container>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-2 sm:mt-8">
        <nav className="flex space-x-4">
          {resources.map((d, i) => (
            <Link
              key={i}
              href={`/resources/${d}`}
              className={clsx(
                'rounded-md px-3 py-2 capitalize text-base font-medium',
                d === resource ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400',
              )}
            >
              {d}
            </Link>
          ))}
        </nav>
        <div className="max-w-sm">
          <input
            placeholder={`Search by ${resource === 'assets' ? 'Denom / Symbol / Address' : 'Chain Name / ID'}`}
            value={input}
            onChange={e => setInput(split(e.target.value, { delimiter: ' ', filterBlank: false }).join(' '))}
            className="w-full sm:w-80 h-10 bg-zinc-50 dark:bg-zinc-800 appearance-none border-zinc-200 dark:border-zinc-700 focus:ring-0 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 px-3"
          />
        </div>
      </div>
      {render(resource)}
    </Container>
  )
}
