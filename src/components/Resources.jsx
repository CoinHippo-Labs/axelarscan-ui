'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import _ from 'lodash'
import { LuFileSearch2 } from 'react-icons/lu'
import { GoDotFill } from 'react-icons/go'

import { Container } from '@/components/Container'
import { Image } from '@/components/Image'
import { Tooltip } from '@/components/Tooltip'
import { Tag } from '@/components/Tag'
import { AddMetamask } from '@/components/Metamask'
import { ValueBox } from '@/components/ValueBox'
import { useGlobalStore } from '@/components/Global'
import { getChainData } from '@/lib/config'
import { getIBCDenomBase64, split, toArray } from '@/lib/parser'
import { includesStringList } from '@/lib/operator'
import { equalsIgnoreCase, ellipse } from '@/lib/string'

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
              alt=""
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

function Asset({ data, focusID, onFocus }) {
  const NUM_CHAINS_TRUNCATE = 6
  const [seeMore, setSeeMore] = useState(false)
  const [chainSelected, setChainSelected] = useState(null)
  const { chains } = useGlobalStore()

  const { type, denom, denoms, native_chain, name, symbol, decimals, image } = { ...data }
  let { addresses } = { ...data }
  const _id = type === 'its' ? data.id : denom
  const { id, explorer, chain_type } = { ...(focusID === _id && getChainData(chainSelected, chains)) }
  const { url, contract_path, asset_path } = { ...explorer }
  addresses = _.uniqBy(toArray(_.concat({ chain: native_chain, ...(type === 'its' ? data.chains?.[native_chain] : addresses?.[native_chain]) }, Object.entries({ ...(type === 'its' ? data.chains : addresses) }).map(([k, v]) => ({ chain: k, ...v })))), 'chain').filter(d => getChainData(d.chain, chains)).map(d => ({ ...d, address: d.address || d.tokenAddress }))
  const tokenData = addresses.find(d => d.chain === id)
  const { address, ibc_denom } = { ...tokenData }
  const tokenSymbol = tokenData?.symbol || symbol

  useEffect(() => {
    if (focusID !== _id) setSeeMore(false)
  }, [focusID, data, type, denom])

  return (
    <li>
      <div className="relative bg-zinc-50/75 dark:bg-zinc-800/25 p-6 rounded-2xl">
        <div className="flex items-start justify-between">
          <div className="overflow-hidden">
            <Image
              src={image}
              alt=""
              width={56}
              height={56}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-end gap-y-1">
            {symbol && <Tag>{symbol}</Tag>}
            <div className="flex flex-wrap items-center">
              {toArray(_.concat(denom, _.head(denoms))).map(d => (
                <Tag key={d} className="bg-orange-400 dark:bg-orange-500 font-normal whitespace-nowrap ml-1 mt-1">
                  {ellipse(d)}
                </Tag>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-display text-xl font-medium">{name}</span>
          {decimals > 0 && <span className="text-zinc-400 dark:text-zinc-500 text-sm font-normal whitespace-nowrap mt-0.5">Decimals: {decimals}</span>}
        </div>
        <div className="flex flex-col gap-y-4 mt-6 mb-1">
          <div className="flex flex-col gap-y-1">
            <span className="text-base text-zinc-400 dark:text-zinc-500">
              {type === 'its' ? 'Interchain' : 'Gateway'} Tokens
            </span>
            <div className="flex flex-wrap items-center">
              {_.slice(addresses, 0, focusID === _id && seeMore ? addresses.length : NUM_CHAINS_TRUNCATE).map((d, i) => {
                const { chain, address, ibc_denom, symbol } = { ...d }
                const { name, image } = { ...getChainData(chain, chains) }

                return (
                  <div key={i} className="mr-1.5 mb-1.5">
                    <Tooltip content={`${name}${chain === native_chain ? ' (Native Chain)' : ''}`} className="whitespace-nowrap">
                      <button
                        onClick={() => {
                          setChainSelected(chain === chainSelected ? null : chain)
                          if (onFocus) onFocus(_id)
                        }}
                      >
                        <Image
                          src={image}
                          alt=""
                          width={24}
                          height={24}
                          className={clsx(
                            'rounded-full',
                            focusID === _id && chain === chainSelected ? 'border-2 border-blue-600 dark:border-blue-500' : chain === native_chain ? 'border-2 border-orange-400 dark:border-orange-500' : '',
                          )}
                        />
                      </button>
                    </Tooltip>
                  </div>
                )
              })}
              {addresses.length > NUM_CHAINS_TRUNCATE && (
                <button
                  onClick={() => {
                    setSeeMore(!seeMore)
                    if (onFocus) onFocus(_id)
                  }}
                  className="bg-zinc-100 dark:bg-zinc-800 rounded text-blue-600 dark:text-blue-500 text-xs 3xl:text-sm font-medium mb-1.5 px-1.5 3xl:px-2.5 py-1 3xl:py-1.5"
                >
                  {seeMore ? 'See Less' : `+${addresses.length - NUM_CHAINS_TRUNCATE} More`}
                </button>
              )}
            </div>
          </div>
          {id && (
            <div className="flex flex-col gap-y-3">
              <div className="flex items-center justify-between gap-x-2">
                <Tag className="uppercase">{id}</Tag>
                {chain_type === 'evm' && <AddMetamask chain={id} asset={_id} type={type} />}
              </div>
              {address && (
                <ValueBox
                  title="Token Contract"
                  value={address}
                  url={url && `${url}${contract_path?.replace('{address}', address)}`}
                />
              )}
              {ibc_denom && (
                <ValueBox
                  title="IBC Denom"
                  value={ibc_denom}
                  url={url && asset_path && `${url}${asset_path.replace('{ibc_denom}', getIBCDenomBase64(ibc_denom))}`}
                  prefix="ibc/"
                />
              )}
              {tokenSymbol && (
                <ValueBox
                  title="Symbol"
                  value={tokenSymbol}
                  url={url && (address ? `${url}${contract_path?.replace('{address}', address)}` : asset_path && ibc_denom ? `${url}${asset_path.replace('{ibc_denom}', getIBCDenomBase64(ibc_denom))}` : null)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

const resources = ['chains', 'assets']

export function Resources({ resource }) {
  const router = useRouter()
  const pathname = usePathname()
  const [rendered, setRendered] = useState(false)
  const [input, setInput] = useState('')
  const [assetFocusID, setAssetFocusID] = useState(null)
  const { chains, assets, itsAssets } = useGlobalStore()

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
  }, [router, pathname, rendered, setRendered, resource, setInput, setAssetFocusID])

  const filter = resource => {
    const words = split(input, { delimiter: ' ', toCase: 'lower' })
    switch (resource) {
      case 'chains':
        return toArray(chains).filter(d => !d.no_inflation || d.deprecated).filter(d => !input || includesStringList(_.uniq(toArray(['id', 'chain_id', 'chain_name', 'name'].map(f => d[f]?.toString()), { toCase: 'lower' })), words))
      case 'assets':
        return _.concat(
          toArray(assets).filter(d => !input || includesStringList(_.uniq(toArray(_.concat(['denom', 'name', 'symbol'].map(f => d[f]), d.denoms, Object.values({ ...d.addresses }).flatMap(a => toArray([!equalsIgnoreCase(input, 'axl') && a.symbol, a.address, a.ibc_denom]))), { toCase: 'lower' })), words)),
          toArray(itsAssets).filter(d => !input || includesStringList(_.uniq(toArray(_.concat(['name', 'symbol'].map(f => d[f]), Object.values({ ...d.chains }).flatMap(a => toArray([!equalsIgnoreCase(input, 'axl') && a.symbol, a.tokenAddress]))), { toCase: 'lower' })), words)).map(d => ({ ...d, type: 'its' })),
        )
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
          <ul role="list" className="w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filter(resource).map((d, i) => <Asset key={i} data={d} focusID={assetFocusID} onFocus={id => setAssetFocusID(id)} />)}
          </ul>
        )
      default:
        return <div />
    }
  }

  return resource && (
    <Container className="flex flex-col gap-y-8 sm:gap-y-12 sm:mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-x-2 gap-y-4 sm:gap-y-0">
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
            className="w-full sm:w-80 h-10 bg-white dark:bg-zinc-900 appearance-none border-zinc-200 hover:border-blue-300 focus:border-blue-600 dark:border-zinc-700 dark:hover:border-blue-800 dark:focus:border-blue-500 focus:ring-0 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 px-3"
          />
        </div>
      </div>
      {render(resource)}
    </Container>
  )
}
