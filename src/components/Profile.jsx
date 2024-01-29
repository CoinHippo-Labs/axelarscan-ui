import Link from 'next/link'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'

import Image from '@/components/Image'
import { Copy } from '@/components/Copy'
import { Spinner } from '@/components/Spinner'
import { Number } from '@/components/Number'
import { useGlobalStore } from '@/app/providers'
import { getKeybaseUser } from '@/lib/api/keybase'
import { getENS } from '@/lib/api/name-services/ens'
import { getLENS } from '@/lib/api/name-services/lens'
import { getSpaceID } from '@/lib/api/name-services/spaceid'
import { getUnstoppable } from '@/lib/api/name-services/unstoppable'
import { ENVIRONMENT, getChainData, getAssetData, getITSAssetData } from '@/lib/config'
import { getIcapAddress, toHex, split, toArray } from '@/lib/parser'
import { includesStringList } from '@/lib/operator'
import { equalsIgnoreCase, capitalize, ellipse } from '@/lib/string'
import { isNumber } from '@/lib/number'
import { timeDiff } from '@/lib/time'
import accounts from '@/data/accounts'
import broadcasters from '@/data/broadcasters'
import its from '@/data/its'
import ENSLogo from '@/images/name-services/ens.png'
import LENSLogo from '@/images/name-services/lens.png'
import SpaceIDLogo from '@/images/name-services/spaceid.png'
import UnstoppableLogo from '@/images/name-services/unstoppable.png'

export const useNameServicesStore = create()(set => ({
  ens: null,
  lens: null,
  spaceID: null,
  unstoppable: null,
  setENS: data => set(state => ({ ...state, ens: { ...state.ens, ...data } })),
  setLENS: data => set(state => ({ ...state, lens: { ...state.lens, ...data } })),
  setSpaceID: data => set(state => ({ ...state, spaceID: { ...state.spaceID, ...data } })),
  setUnstoppable: data => set(state => ({ ...state, unstoppable: { ...state.unstoppable, ...data } })),
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
        if (!data?.[a]) data = { ...data, [a]: {} }
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
          setDefaultData(addresses, data)
          setSpaceID({ ...data })
        }
      }
    }

    getData()
  }, [address, spaceID, setSpaceID])

  const { name } = { ...spaceID?.[address?.toLowerCase()] }
  const src = SpaceIDLogo

  const element = name ?
    <span title={name} className={clsx('font-medium', className)}>
      {ellipse(name, 16)}
    </span> :
    <span className={clsx('font-medium', className)}>
      {ellipse(address, 8, '0x')}
    </span>

  return name ?
    <div className="flex items-center">
      {typeof image404 === 'boolean' ?
        <Image
          src={image404 ? SpaceIDLogo : src}
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
        <div className="flex items-center gap-x-1">
          <Link
            href={url}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {element}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        noCopy ? element : <Copy size={width < 24 ? 16 : 18} value={address}><span className={clsx(className)}>{element}</span></Copy>
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

export function LENSProfile({
  address,
  url,
  width = 24,
  height = 24,
  noCopy = false,
  className,
}) {
  const [image404, setImage404] = useState(null)
  const { lens, setLENS } = useNameServicesStore()

  useEffect(() => {
    const setDefaultData = (addresses, data) => {
      addresses.forEach(a => {
        if (!data?.[a]) data = { ...data, [a]: {} }
      })
      return data
    }

    const getData = async () => {
      if (address) {
        const addresses = toArray(address, { toCase: 'lower' }).filter(a => !lens?.[a])

        if (addresses.length > 0) {
          let data = setDefaultData(addresses, lens)
          setLENS({ ...data })

          data = await getLENS(addresses)
          setDefaultData(addresses, data)
          setLENS({ ...data })
        }
      }
    }

    getData()
  }, [address, lens, setLENS])

  const { handle, picture } = { ...lens?.[address?.toLowerCase()] }
  const name = handle
  const src = picture?.original?.url

  const element = name ?
    <span title={name} className={clsx('font-medium', className)}>
      {ellipse(name, 16)}
    </span> :
    <span className={clsx('font-medium', className)}>
      {ellipse(address, 8, '0x')}
    </span>

  return name ?
    <div className="flex items-center">
      {typeof image404 === 'boolean' ?
        <Image
          src={image404 ? LENSLogo : src}
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
        <div className="flex items-center gap-x-1">
          <Link
            href={url}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {element}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        noCopy ? element : <Copy size={width < 24 ? 16 : 18} value={address}><span className={clsx(className)}>{element}</span></Copy>
      }
    </div> :
    <UnstoppableProfile
      address={address}
      url={url}
      width={width}
      height={height}
      noCopy={noCopy}
      className={className}
    />
}

export function UnstoppableProfile({
  address,
  url,
  width = 24,
  height = 24,
  noCopy = false,
  className,
}) {
  const [image404, setImage404] = useState(null)
  const { unstoppable, setUnstoppable } = useNameServicesStore()

  useEffect(() => {
    const setDefaultData = (addresses, data) => {
      addresses.forEach(a => {
        if (!data?.[a]) data = { ...data, [a]: {} }
      })
      return data
    }

    const getData = async () => {
      if (address) {
        const addresses = toArray(address, { toCase: 'lower' }).filter(a => !unstoppable?.[a])

        if (addresses.length > 0) {
          let data = setDefaultData(addresses, unstoppable)
          setUnstoppable({ ...data })

          data = await getUnstoppable(addresses)
          setDefaultData(addresses, data)
          setUnstoppable({ ...data })
        }
      }
    }

    getData()
  }, [address, unstoppable, setUnstoppable])

  const { name } = { ...unstoppable?.[address?.toLowerCase()] }
  const src = UnstoppableLogo

  const element = name ?
    <span title={name} className={clsx('font-medium', className)}>
      {ellipse(name, 16)}
    </span> :
    <span className={clsx('font-medium', className)}>
      {ellipse(address, 8, '0x')}
    </span>

  return name ?
    <div className="flex items-center">
      {typeof image404 === 'boolean' ?
        <Image
          src={image404 ? UnstoppableLogo : src}
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
        <div className="flex items-center gap-x-1">
          <Link
            href={url}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {element}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        noCopy ? element : <Copy size={width < 24 ? 16 : 18} value={address}><span className={clsx(className)}>{element}</span></Copy>
      }
    </div> :
    <ENSProfile
      address={address}
      url={url}
      width={width}
      height={height}
      noCopy={noCopy}
      origin="unstoppable"
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
        if (!data?.[a]) data = { ...data, [a]: {} }
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
          setDefaultData(addresses, data)
          setENS({ ...data })
        }
      }
    }

    getData()
  }, [address, ens, setENS])

  const { name } = { ...ens?.[address?.toLowerCase()] }
  const src = `https://metadata.ens.domains/mainnet/avatar/${name}`

  const element = name ?
    <span title={name} className={clsx('font-medium', className)}>
      {ellipse(name, 16)}
    </span> :
    <span className={clsx('font-medium', className)}>
      {ellipse(address, 8, '0x')}
    </span>

  return name ?
    <div className="flex items-center">
      {typeof image404 === 'boolean' ?
        <Image
          src={image404 ? ENSLogo : src}
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
        <div className="flex items-center gap-x-1">
          <Link
            href={url}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {element}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        noCopy ? element : <Copy size={width < 24 ? 16 : 18} value={address}><span className={clsx(className)}>{element}</span></Copy>
      }
    </div> :
    origin !== 'unstoppable' ?
      <UnstoppableProfile
        address={address}
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
            {element}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        noCopy ? element : <Copy size={width < 24 ? 16 : 18} value={address}><span className={clsx(className)}>{element}</span></Copy>
}

export function EVMProfile({ chain, ...props }) {
  let Profile
  switch (chain) {
    case 'binance':
    case 'arbitrum':
      Profile = SpaceIDProfile
      break
    case 'polygon':
      Profile = LENSProfile
      break
    default:
      Profile = !chain?.includes('ethereum') ? UnstoppableProfile : ENSProfile
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
  noCopy = false,
  customURL,
  className,
}) {
  const { chains, contracts, configurations, validators } = useGlobalStore()
  const { validatorImages, setValidatorImages } = useValidatorImagesStore()

  address = Array.isArray(address) ? toHex(address) : address
  chain = address?.startsWith('axelar') ? 'axelarnet' : chain?.toLowerCase()
  prefix = !address ? prefix : address.startsWith('axelar') && !prefix?.startsWith('axelar') ? 'axelar' : address.startsWith('0x') ? '0x' : _.head(split(address, { delimiter: '' }).filter(c => isNumber(c))) === '1' ? address.substring(0, address.indexOf('1')) : prefix

  const { interchain_token_service_contract, gateway_contracts, gas_service_contracts } = { ...contracts }
  const itss = toArray(interchain_token_service_contract?.addresses).map(a => ({ address: a, name: 'Interchain Token Service', image: AXELAR_LOGO }))
  const gateways = Object.values({ ...gateway_contracts }).filter(d => d.address).map(d => ({ ...d, name: 'Axelar Gateway', image: AXELAR_LOGO }))
  const gasServices = Object.values({ ...gas_service_contracts }).filter(d => d.address).map(d => ({ ...d, name: 'Axelar Gas Service', image: AXELAR_LOGO }))

  const { relayers, express_relayers, refunders } = { ...configurations }
  const executorRelayers = _.uniq(toArray(_.concat(relayers, refunders, Object.keys({ ...broadcasters[ENVIRONMENT] })))).map(a => ({ address: a, name: 'Axelar Relayer', image: AXELAR_LOGO }))
  const expressRelayers = _.uniq(toArray(express_relayers)).map(a => ({ address: a, name: 'Axelar Express Relayer', image: AXELAR_LOGO }))

  // custom
  let { name, image } = { ...toArray(_.concat(accounts, itss, gateways, gasServices, executorRelayers, expressRelayers)).find(d => equalsIgnoreCase(d.address, address) && (!d.environment || equalsIgnoreCase(d.environment, ENVIRONMENT))) }

  // validator
  let isValidator
  if (address?.startsWith('axelar') && !name && validators) {
    const { broadcaster_address, operator_address, description } = { ...validators.find(d => includesStringList(address, toArray([d.broadcaster_address, d.operator_address, d.delegator_address, d.consensus_address], { toCase: 'lower' }))) }
    const { moniker } = { ...description }

    if (moniker) name = `${moniker}${equalsIgnoreCase(address, broadcaster_address) ? `: Proxy` : ''}`
    image = validatorImages[operator_address]?.image || image
    isValidator = true
  }

  // Icap address format for EVM
  address = address?.startsWith('0x') && address !== '0x' ? getIcapAddress(address) : address

  useEffect(() => {
    const getData = async () => {
      if (address?.startsWith('axelar') && validators) {
        const { operator_address, description } = { ...validators.find(d => includesStringList(address, toArray([d.broadcaster_address, d.operator_address, d.delegator_address], { toCase: 'lower' }))) }
        const { moniker, identity } = { ...description }

        let value = validatorImages[operator_address]
        let { image } = { ...value }

        if (image && timeDiff(value.updatedAt) < 3600) value = null
        else if (identity) {
          const { them } = { ...await getKeybaseUser({ key_suffix: identity }) }
          const { url } = { ..._.head(them)?.pictures?.primary }
          image = url || image
          value = { image, updatedAt: moment().valueOf() }
        }
        else value = null

        if (!image) {
          if (moniker?.startsWith('axelar-core-')) image = AXELAR_LOGO
          else if (!identity) image = randImage()
          if (image) value = { image, updatedAt: moment().valueOf() }
        }

        if (value) setValidatorImages({ [operator_address]: value })
      }
    }
    getData()
  }, [address, validators, setValidatorImages])

  const { explorer } = { ...getChainData(chain, chains) }
  const url = customURL || (explorer ? `${explorer.url}${explorer.address_path?.replace('{address}', address)}` : undefined)

  return address && (name ?
    <div className={clsx('min-w-max flex items-center', width < 24 ? 'gap-x-1.5' : 'gap-x-2 3xl:gap-x-3', className)}>
      {image ?
        <Image
          src={image}
          width={width}
          height={height}
          className={clsx('rounded-full', width === 24 && 'w-6 3xl:w-8 h-6 3xl:h-8')}
        /> :
        // isValidator && <Spinner className="!w-6 !h-6" />
        isValidator && (
          <Image
            src={randImage(i)}
            width={width}
            height={height}
            className={clsx('rounded-full', width === 24 && 'w-6 3xl:w-8 h-6 3xl:h-8')}
          />
        )
      }
      <div className="flex items-center gap-x-1">
        <Link
          href={url || `/${address.startsWith('axelar') ? prefix === 'axelarvaloper' ? 'validator' : 'account' : 'address'}/${address}`}
          target="_blank"
          className="text-blue-600 dark:text-blue-500 font-medium"
        >
          {ellipse(name, isValidator ? 10 : 16)}
        </Link>
        {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
      </div>
    </div> :
    address.startsWith('0x') ?
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
            href={url || `/${address.startsWith('axelar') ? prefix === 'axelarvaloper' ? 'validator' : 'account' : 'address'}/${address}`}
            target="_blank"
            className="text-blue-600 dark:text-blue-500 font-medium"
          >
            {ellipse(address, 8, prefix)}
          </Link>
          {!noCopy && <Copy size={width < 24 ? 16 : 18} value={address} />}
        </div> :
        <Copy size={width < 24 ? 16 : 18} value={address}><span className={clsx(className)}>{ellipse(address, 8, prefix)}</span></Copy>
  )
}

export function ChainProfile({
  value,
  width = 24,
  height = 24,
  className,
  titleClassName,
}) {
  const { chains } = useGlobalStore()
  const { name, image } = { ...getChainData(value, chains) }

  return value && (
    <div className={clsx('min-w-max flex items-center gap-x-2', className)}>
      {image && (
        <Image
          src={image}
          width={width}
          height={height}
        />
      )}
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
  ITSPossible = false,
  onlyITS = false,
  width = 24,
  height = 24,
  className,
  titleClassName,
}) {
  const { assets, itsAssets } = useGlobalStore()

  const assetData = (!onlyITS && getAssetData(addressOrDenom || value, assets)) || (ITSPossible && getITSAssetData(addressOrDenom || value, _.concat(its, itsAssets)))
  const { addresses } = { ...assetData }
  let { symbol, image } = { ...assetData }
  symbol = addresses?.[chain]?.symbol || symbol
  image = addresses?.[chain]?.image || image

  return value && (
    <div className={clsx('min-w-max flex items-center', isNumber(amount) ? 'gap-x-1.5' : 'gap-x-2', className)}>
      {image && (
        <Image
          src={image}
          width={width}
          height={height}
        />
      )}
      {isNumber(amount) && (
        <Number
          value={amount}
          format="0,0.000000"
          className={clsx('text-zinc-900 dark:text-zinc-100 font-medium', titleClassName)}
        />
      )}
      <span className={clsx('text-zinc-900 dark:text-zinc-100 font-medium whitespace-nowrap', titleClassName)}>
        {symbol || value}
      </span>
    </div>
  )
}
