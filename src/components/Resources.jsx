'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import { LuFileSearch2 } from 'react-icons/lu'
import { GoDotFill } from 'react-icons/go'

import { Container } from '@/components/Container'
import Image from '@/components/Image'
import { Tooltip } from '@/components/Tooltip'
import { Tag } from '@/components/Tag'
import { AddMetamask } from '@/components/Metamask'
import { ValueBox } from '@/components/ValueBox'
import { useGlobalStore } from '@/app/providers'
import { split, toArray } from '@/lib/parser'
import { includesStringList } from '@/lib/operator'
import { equalsIgnoreCase } from '@/lib/string'

const resources = ['chains', 'assets']

function Chain({ data }) {
  const { contracts } = useGlobalStore()
  const { gateway_contracts, gas_service_contracts } = { ...contracts }

  const { id, chain_id, chain_name, deprecated, endpoints, name, image, explorer, prefix_address, chain_type } = { ...data }
  const { rpc, lcd } = { ...endpoints }
  const { url, address_path } = { ...explorer }
  const gatewayAddress = gateway_contracts?.[id]?.address
  const gasServiceAddress = gas_service_contracts?.[id]?.address

  return (
    <li>
      <div className="relative bg-zinc-50/75 dark:bg-zinc-800/25 p-6 rounded-2xl">
        <div className="flex items-start justify-between">
          <div className="overflow-hidden">
            <Image
              src={image}
              width={56}
              height={56}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-end gap-y-2.5">
            <div className="flex items-center gap-x-2">
              {chain_type === 'evm' && <AddMetamask chain={id} />}
              {url && (
                <Tooltip content="Explorer">
                  <a
                    href={url}
                    target="_blank"
                    className="text-blue-600 dark:text-blue-500"
                  >
                    <LuFileSearch2 size={24} />
                  </a>
                </Tooltip>
              )}
              <Tooltip content={deprecated ? 'Deactivated' : 'Active'}>
                <GoDotFill size={18} className={clsx(deprecated ? 'text-red-600' : 'text-green-600')} />
              </Tooltip>
            </div>
            {chain_type && <Tag className="uppercase">{chain_type}</Tag>}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-display text-xl font-medium">{name}</span>
          {chain_id && <span className="text-zinc-400 dark:text-zinc-500 text-sm font-normal whitespace-nowrap mt-0.5">ID: {chain_id}</span>}
        </div>
        <div className="flex flex-col gap-y-4 mt-6 mb-1">
          {chain_name && <ValueBox title="Chain Name" value={chain_name} />}
          {gatewayAddress && (
            <ValueBox
              title="Gateway Address"
              value={gatewayAddress}
              url={url && `${url}${address_path?.replace('{address}', gatewayAddress)}`}
            />
          )}
          {gasServiceAddress && (
            <ValueBox
              title="Gas Service Address"
              value={gasServiceAddress}
              url={url && `${url}${address_path?.replace('{address}', gasServiceAddress)}`}
            />
          )}
          {toArray(rpc).length > 0 && (
            <ValueBox
              title="RPC Endpoint"
              value={_.head(toArray(rpc))}
              url={_.head(toArray(rpc))}
              noEllipse={true}
            />
          )}
          {toArray(lcd).length > 0 && (
            <ValueBox
              title="LCD Endpoint"
              value={_.head(toArray(lcd))}
              url={_.head(toArray(lcd))}
              noEllipse={true}
            />
          )}
          {prefix_address && <ValueBox title="Address Prefix" value={prefix_address} />}
        </div>
      </div>
    </li>
  )
}

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
          <ul role="list" className="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filter(resource).map((d, i) => <Chain key={i} data={d} />)}
          </ul>
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
    <Container className="flex flex-col gap-y-8 sm:gap-y-12 sm:mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-4 sm:gap-y-0 sm:gap-x-2">
        <nav className="flex gap-x-4">
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
