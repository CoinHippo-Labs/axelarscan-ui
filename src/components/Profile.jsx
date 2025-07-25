'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'

import { Image } from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Number } from '@/components/Number'
import { useGlobalStore } from '@/components/Global'
import { getKeybaseUser } from '@/lib/api/keybase'
import { getENS } from '@/lib/api/name-services/ens'
import { getSpaceID } from '@/lib/api/name-services/spaceid'
import { ENVIRONMENT, axelarContractFields, getChainData, getAssetData, getITSAssetData } from '@/lib/config'
import { getIcapAddress, toHex, toCase, split, toArray } from '@/lib/parser'
import { equalsIgnoreCase, capitalize, includesSomePatterns, ellipse, toTitle } from '@/lib/string'
import { isNumber } from '@/lib/number'
import { timeDiff } from '@/lib/time'
import accounts from '@/data/accounts'
import broadcasters from '@/data/broadcasters'
import ENSLogo from '@/images/name-services/ens.png'
import SpaceIDLogo from '@/images/name-services/spaceid.png'

export const useNameServicesStore = create()(set => ({
  ens: null,
  spaceID: null,
  setENS: data => set(state => ({ ...state, ens: { ...state.ens, ...data } })),
  setSpaceID: data => set(state => ({ ...state, spaceID: { ...state.spaceID, ...data } })),
}))

export function SpaceIDProfile({
  address,
  url,
  width = 24,
  height = 24,
  noCopy = false,
  className,
}) {
  const [image404, setImage404] = useState(null)
  const { spaceID, setSpaceID } = useNameServicesStore()

  useEffect(() => {
    const setDefaultData = (addresses, data) => {
      addresses.forEach(a => {
        if (!data?.[a]) {
          data = { ...data, [a]: {} }
        }
      })

      return data
    }

    const getData = async () => {
      if (address) {
        const addresses = toArray(address, { toCase: 'lower' }).filter(a => !spaceID?.[a])

        if (addresses.length > 0) {
          let data = setDefaultData(addresses, spaceID)
          setSpaceID({ ...data })

          data = await getSpaceID(addresses)
          data = setDefaultData(addresses, data)
          setSpaceID({ ...data })
        }
      }
    }

    getData()
  }, [address, spaceID, setSpaceID])

  const { name } = { ...spaceID?.[toCase(address, 'lower')] }
  const src = SpaceIDLogo

  const element = name ?
    <span title={name} className={clsx('font-medium', className)}>
      {ellipse(name, 16)}
    </span> :
    <span className={clsx('font-medium', className)}>
      {ellipse(address, 4, '0x')}
    </span>

  return name ?
    <div className="flex items-center">
      {typeof image404 === 'boolean' ?
        <Image
          src={image404 ? SpaceIDLogo : src}
          alt=""
          width={width}
          height={height}
          className={clsx('rounded-full', width === 24 && 'w-6 3xl:w-8 h-6 3xl:h-8', width < 24 ? 'mr-1.5' : 'mr-2 3xl:mr-3')}
        /> :
        <img
          src={src}
          alt=""
          onLoad={() => setImage404(false)}
          onError={() => setImage404(true)}
          className={clsx('rounded-full', width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : 'w-5 h-5', width < 24 ? 'mr-1.5' : 'mr-2 3xl:mr-3')}
        />
      }
      {url ?
        <div className={clsx('flex items-center gap-x-1', className)}>
          <Link
            href={url}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {element}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        noCopy ?
          element :
          <Copy size={width < 24 ? 16 : 18} value={address}>
            <span className={clsx(className)}>
              {element}
            </span>
          </Copy>
      }
    </div> :
    <ENSProfile
      address={address}
      url={url}
      width={width}
      height={height}
      noCopy={noCopy}
      className={className}
    />
}

export function ENSProfile({
  address,
  url,
  width = 24,
  height = 24,
  noCopy = false,
  origin,
  className,
}) {
  const [image404, setImage404] = useState(null)
  const { ens, setENS } = useNameServicesStore()

  useEffect(() => {
    const setDefaultData = (addresses, data) => {
      addresses.forEach(a => {
        if (!data?.[a]) {
          data = { ...data, [a]: {} }
        }
      })

      return data
    }

    const getData = async () => {
      if (address) {
        const addresses = toArray(address, { toCase: 'lower' }).filter(a => !ens?.[a])

        if (addresses.length > 0) {
          let data = setDefaultData(addresses, ens)
          setENS({ ...data })

          data = await getENS(addresses)
          data = setDefaultData(addresses, data)
          setENS({ ...data })
        }
      }
    }

    getData()
  }, [address, ens, setENS])

  const { name } = { ...ens?.[toCase(address, 'lower')] }
  const src = `https://metadata.ens.domains/mainnet/avatar/${name}`

  const element = name ?
    <span title={name} className={clsx('font-medium', className)}>
      {ellipse(name, 16)}
    </span> :
    <span className={clsx('font-medium', className)}>
      {ellipse(address, 4, '0x')}
    </span>

  return (
    <div className="flex items-center">
      {name && (
        typeof image404 === 'boolean' ?
          <Image
            src={image404 ? ENSLogo : src}
            alt=""
            width={width}
            height={height}
            className={clsx('rounded-full', width === 24 && 'w-6 3xl:w-8 h-6 3xl:h-8', width < 24 ? 'mr-1.5' : 'mr-2 3xl:mr-3')}
          /> :
          <img
            src={src}
            alt=""
            onLoad={() => setImage404(false)}
            onError={() => setImage404(true)}
            className={clsx('rounded-full', width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : 'w-5 h-5', width < 24 ? 'mr-1.5' : 'mr-2 3xl:mr-3')}
          />
      )}
      {url ?
        <div className={clsx('flex items-center gap-x-1', className)}>
          <Link
            href={url}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {element}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        noCopy ?
          element :
          <Copy size={width < 24 ? 16 : 18} value={address}>
            <span className={clsx(className)}>
              {element}
            </span>
          </Copy>
      }
    </div>
  )
}

export function EVMProfile({ chain, ...props }) {
  let Profile

  switch (chain) {
    case 'binance':
    case 'arbitrum':
      Profile = SpaceIDProfile
      break
    default:
      Profile = ENSProfile
      break
  }

  return <Profile chain={chain} {...props} />
}

const AXELAR_LOGO = '/logos/accounts/axelarnet.svg'
const randImage = i => `/logos/addresses/${isNumber(i) ? (i % 8) + 1 : _.random(1, 8)}.png`

export const useValidatorImagesStore = create()(set => ({
  validatorImages: {},
  setValidatorImages: data => set(state => ({ ...state, validatorImages: { ...state.validatorImages, ...data } })),
}))

export function Profile({
  i,
  address,
  chain,
  prefix = 'axelar',
  width = 24,
  height = 24,
  noResolveName = false,
  noCopy = false,
  customURL,
  useContractLink,
  className,
}) {
  const { chains, contracts, configurations, validators, verifiers } = useGlobalStore()
  const { validatorImages, setValidatorImages } = useValidatorImagesStore()

  // get validator image
  useEffect(() => {
    const getData = async () => {
      if (address?.startsWith('axelar') && validators) {
        const { operator_address, description } = { ...validators.find(d => includesSomePatterns(address, [d.broadcaster_address, d.operator_address, d.delegator_address])) }
        const { moniker, identity } = { ...description }

        let value = validatorImages[operator_address]
        let { image } = { ...value }

        if (image && timeDiff(value.updatedAt) < 3600) {
          value = undefined
        }
        else if (identity) {
          const { them } = { ...await getKeybaseUser({ key_suffix: identity }) }
          const { url } = { ...them?.[0]?.pictures?.primary }

          if (url) {
            image = url
          }

          value = { image, updatedAt: moment().valueOf() }
        }
        else {
          value = undefined
        }

        if (!image) {
          if (moniker?.startsWith('axelar-core-')) {
            image = AXELAR_LOGO
          }
          else if (!identity) {
            image = randImage()
          }

          if (image) {
            value = { image, updatedAt: moment().valueOf() }
          }
        }

        if (value) {
          setValidatorImages({ [operator_address]: value })
        }
      }
    }

    getData()
  }, [address, validators, setValidatorImages])

  if (!address) return

  if (Array.isArray(address)) {
    address = toHex(address)
  }

  // set chain to axelar when address prefix is 'axelar'
  chain = address.startsWith('axelar') ? 'axelarnet' : toCase(chain, 'lower')

  // auto set prefix by address
  if (address.startsWith('axelar') && !prefix?.startsWith('axelar')) {
    prefix = 'axelar1'
  }
  else if (address.startsWith('0x')) {
    prefix = '0x'
  }
  else if (getChainData(chain, chains)?.chain_type === 'cosmos' && split(address, { delimiter: '' }).filter(c => isNumber(c))[0] === '1') {
    prefix = address.substring(0, address.indexOf('1') + 1)
  }

  // contracts
  const { interchain_token_service_contract, gateway_contracts, gas_service_contracts } = { ...contracts }

  const itss = toArray(interchain_token_service_contract?.addresses).map(a => ({
    address: a,
    name: 'Interchain Token Service',
    image: getChainData(chain, chains)?.image || AXELAR_LOGO,
  }))

  const gateways = Object.entries({ ...gateway_contracts }).filter(([k, v]) => v.address).map(([k, v]) => ({
    ...v,
    name: 'Axelar Gateway',
    chain: k,
    image: getChainData(k, chains)?.image || AXELAR_LOGO,
  }))

  const gasServices = Object.entries({ ...gas_service_contracts }).filter(([k, v]) => v.address).map(([k, v]) => ({
    ...v,
    name: 'Axelar Gas Service',
    chain: k,
    image: getChainData(k, chains)?.image || AXELAR_LOGO,
  }))

  const axelarContractAddresses = toArray(chains).flatMap(d => {
    const addresses = []

    for (const f of axelarContractFields) {
      if (d[f]?.address) {
        addresses.push({
          address: d[f].address,
          name: `${d.name} ${f === 'interchain_token_service_hub' ? 'ITS Hub' : toTitle(f, '_', true)}`,
          image: d.image || AXELAR_LOGO,
        })
      }
    }

    return addresses
  })

  // relayers
  const { relayers, express_relayers, refunders } = { ...configurations }

  const executorRelayers = _.uniq(toArray(_.concat(relayers, refunders, Object.keys({ ...broadcasters[ENVIRONMENT] })))).map(a => ({ address: a, name: 'Axelar Relayer', image: AXELAR_LOGO }))
  const expressRelayers = _.uniq(toArray(express_relayers)).map(a => ({ address: a, name: 'Axelar Express Relayer', image: AXELAR_LOGO }))

  // get custom profile
  let { name, image } = { ..._.concat(accounts, itss, gateways, gasServices, axelarContractAddresses, executorRelayers, expressRelayers).find(d => equalsIgnoreCase(d.address, address) && (!d.chain || !chain || equalsIgnoreCase(d.chain, chain)) && (!d.environment || equalsIgnoreCase(d.environment, ENVIRONMENT))) }

  // validator | verifier
  let isValidator
  let isVerifier

  // axelar address
  if (address.startsWith('axelar')) {
    if (!name && validators) {
      const { broadcaster_address, operator_address, description } = { ...validators.find(d => includesSomePatterns(address, [d.broadcaster_address, d.operator_address, d.delegator_address, d.consensus_address])) }

      isValidator = !!operator_address

      if (description?.moniker) {
        name = `${description.moniker}${address === broadcaster_address ? `: Proxy` : ''}`
      }

      if (validatorImages[operator_address]?.image) {
        image = validatorImages[operator_address].image
      }
    }

    if (verifiers) {
      isVerifier = verifiers.findIndex(d => d.address === address) > -1
    }
  }

  // Icap address format for EVM
  if (address.startsWith('0x') && address !== '0x') {
    address = getIcapAddress(address)
  }

  const { explorer } = { ...getChainData(chain, chains) }

  const path = useContractLink && explorer?.cannot_link_contract_via_address_path && explorer.contract_path ? explorer.contract_path : explorer?.address_path
  const url = customURL || (explorer ? `${explorer.url}${path?.replace('{address}', address).replace(prefix === 'axelarvaloper' || isVerifier ? '/account' : '', prefix === 'axelarvaloper' ? '/validator' : isVerifier ? '/verifier' : '')}` : undefined)

  return name ?
    <div className={clsx('min-w-max flex items-center', width < 24 ? 'gap-x-1.5' : 'gap-x-2 3xl:gap-x-3', className)}>
      {image ?
        <Image
          src={image}
          alt=""
          width={width}
          height={height}
          className={clsx('rounded-full', width === 24 && 'w-6 3xl:w-8 h-6 3xl:h-8')}
        /> :
        isValidator && (
          <Image
            src={randImage(i)}
            alt=""
            width={width}
            height={height}
            className={clsx('rounded-full', width === 24 && 'w-6 3xl:w-8 h-6 3xl:h-8')}
          />
        )
      }
      <div className={clsx('flex items-center gap-x-1', className)}>
        <Link
          href={url || `/${address.startsWith('axelar') ? prefix === 'axelarvaloper' ? 'validator' : isVerifier ? 'verifier' : 'account' : 'address'}/${address}`}
          target="_blank"
          className="text-blue-600 dark:text-blue-500 font-medium"
        >
          {ellipse(name, isValidator ? 10 : 16)}
        </Link>
        {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
      </div>
    </div> :
    address.startsWith('0x') && !noResolveName ?
      <EVMProfile
        address={address}
        chain={chain}
        url={url}
        width={width}
        height={height}
        noCopy={noCopy}
        className={className}
      /> :
      url ?
        <div className={clsx('flex items-center gap-x-1', className)}>
          <Link
            href={url}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {ellipse(address, 4, prefix)}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        <Copy size={width < 24 ? 16 : 18} value={address}>
          <span className={clsx(className)}>
            {ellipse(address, 4, prefix)}
          </span>
        </Copy>
}

export function ChainProfile({
  value,
  width = 24,
  height = 24,
  className = 'h-6',
  titleClassName,
}) {
  const { chains } = useGlobalStore()

  if (!value) return

  const { name, image } = { ...getChainData(value, chains) }

  return (
    <div className={clsx('min-w-max flex items-center gap-x-2', className)}>
      <Image
        src={image}
        alt=""
        width={width}
        height={height}
        className={className}
      />
      <span className={clsx('text-zinc-900 dark:text-zinc-100 font-medium whitespace-nowrap', titleClassName)}>
        {name || capitalize(value)}
      </span>
    </div>
  )
}

export function AssetProfile({
  value,
  chain,
  amount,
  addressOrDenom,
  customAssetData,
  ITSPossible = false,
  onlyITS = false,
  isLink = false,
  width = 24,
  height = 24,
  className = 'h-6',
  titleClassName,
}) {
  const { chains, assets, itsAssets } = useGlobalStore()

  if (!value) return

  const assetData = (!onlyITS && getAssetData(addressOrDenom || value, assets)) ||
    (ITSPossible && getITSAssetData(addressOrDenom || value, itsAssets)) ||
    customAssetData

  const { addresses } = { ...assetData }
  let { symbol, image } = { ...assetData }

  // default to first chain
  if (!chain && assetData?.chains) {
    chain = Object.keys(assetData.chains)[0]
  }

  // set symbol and image of specific chain if exists
  if (addresses?.[chain]) {
    if (addresses[chain].symbol) {
      symbol = addresses[chain].symbol
    }

    if (addresses[chain].image) {
      image = addresses[chain].image
    }
  }

  const { url, contract_path } = { ...getChainData(chain, chains)?.explorer }

  const element = value && (
    <div className={clsx('min-w-max flex items-center', isNumber(amount) ? 'gap-x-1.5' : 'gap-x-2', className)}>
      <Image
        src={image}
        alt=""
        width={width}
        height={height}
      />
      {isNumber(amount) && (
        <Number
          value={amount}
          format="0,0.000000"
          className={clsx('text-zinc-900 dark:text-zinc-100 font-medium', titleClassName)}
        />
      )}
      <span className={clsx('font-medium whitespace-nowrap', isLink && url ? 'text-blue-600 dark:text-blue-500' : 'text-zinc-900 dark:text-zinc-100', titleClassName)}>
        {symbol || (value === addressOrDenom ? ellipse(value, 4, '0x') : value)}
      </span>
    </div>
  )

  if (isLink && url) {
    return (
      <Link href={`${url}${contract_path?.replace('{address}', addressOrDenom || value)}`} target="_blank">
        {element}
      </Link>
    )
  }

  return element
}
