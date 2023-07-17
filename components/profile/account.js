import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import ValidatorProfile from './validator'
import ENSProfile from './ens'
import Image from '../image'
import Copy from '../copy'
import { split, toArray, includesStringList, ellipse, equalsIgnoreCase, toHex } from '../../lib/utils'
import accounts from '../../data/accounts'
import broadcasters from '../../data/broadcasters'

const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT

export default (
  {
    address,
    ellipseLength = 10,
    prefix = 'axelar',
    copyAddress = false,
    width = 24,
    height = 24,
    noCopy = false,
    noValidator = false,
    explorer,
    url,
    className = 'cursor-pointer font-medium',
  },
) => {
  const { chains, _accounts, validators, profiles } = useSelector(state => ({ chains: state.chains, _accounts: state.accounts, validators: state.validators, profiles: state.profiles }), shallowEqual)
  const { chains_data } = { ...chains }
  const { accounts_data } = { ..._accounts }
  const { validators_data } = { ...validators }
  const { profiles_data } = { ...profiles }

  address = Array.isArray(address) ? toHex(address) : address
  prefix = address ? address.startsWith('axelar') ? 'axelar' : address.startsWith('0x') ? '0x' : _.head(split(address, 'normal', '').filter(c => !isNaN(c))) === '1' ? address.substring(0, address.indexOf('1')) : prefix : prefix
  const gateways_data = toArray(chains_data).filter(c => c.gateway_address).map(c => { return { ...c, address: c.gateway_address, name: 'Axelar Gateway' } })
  let { name, image } = { ...toArray(_.concat(accounts, gateways_data, accounts_data)).find(a => equalsIgnoreCase(a.address, address) && (!a.environment || equalsIgnoreCase(a.environment, ENVIRONMENT))) || (broadcasters[ENVIRONMENT]?.[address?.toLowerCase()] && { name: 'Axelar Relayer', image: '/logos/accounts/axelarnet.svg' }), address }

  let validator_description
  if (address && !noValidator && !name && validators_data) {
    const { broadcaster_address, description } = { ...validators_data.find(v => includesStringList(address, toArray([v.broadcaster_address, v.operator_address, v.delegator_address], 'lower'))) }
    const { moniker, identity } = { ...description }
    validator_description = description
    name = moniker ? `${moniker}${equalsIgnoreCase(address, broadcaster_address) ? `: Proxy` : ''}` : null
    image = profiles_data?.[identity]
  }

  const { address_path } = { ...explorer }
  url = !url && explorer ? `${explorer.url}${address_path?.replace('{address}', address)}` : url

  const nameComponent = name && (
    <>
      <span className="xl:hidden">
        {ellipse(name, ellipseLength * 2)}
      </span>
      <span className="hidden xl:block">
        {ellipse(name, ellipseLength * 2)}
      </span>
    </>
  )

  return address && (
    name ?
      <div className={`min-w-max flex ${noCopy ? 'items-center' : 'items-start'} space-x-2 ${className}`}>
        {image ?
          <Image
            src={image}
            width={width}
            height={height}
            className={`${width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : ''} rounded-full`}
          /> :
          validator_description ?
            <ValidatorProfile
              description={validator_description}
              className={`${width === 24 ? 'w-6 3xl:w-8 h-6 3xl:h-8' : ''}`}
            /> :
            null
        }
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            {url ?
              <Link
                href={typeof url === 'string' ? url : `/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 dark:text-blue-500 font-medium"
              >
                {nameComponent}
              </Link> :
              <div className="text-blue-400 dark:text-blue-500 font-medium">
                {nameComponent}
              </div>
            }
            {noCopy && <Copy value={address} />}
          </div>
          {!noCopy && (
            <Copy
              value={address}
              title={
                <div className="cursor-pointer text-slate-400 dark:text-slate-600">
                  <div className="hidden sm:block md:hidden">
                    {ellipse(address, parseInt(ellipseLength / 2), prefix)}
                  </div>
                  <div className="block sm:hidden md:block">
                    {ellipse(address, ellipseLength, prefix)}
                  </div>
                </div>
              }
            />
          )}
        </div>
      </div> :
      address?.startsWith('0x') ?
        <ENSProfile
          address={address}
          copyAddress={copyAddress}
          width={width}
          height={height}
          url={url}
          className={className}
        /> :
        url ?
          <div className={`flex items-center space-x-1 ${className}`}>
            <Link
              href={typeof url === 'string' ? url : `/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 dark:text-blue-500 font-medium"
            >
              <div>
                <div className="hidden sm:block md:hidden">
                  {ellipse(address, parseInt(ellipseLength / 2), prefix)}
                </div>
                <div className="block sm:hidden md:block">
                  {ellipse(address, ellipseLength, prefix)}
                </div>
              </div>
            </Link>
            <Copy value={address} />
          </div> :
          <Copy
            value={address}
            title={
              <div className={`cursor-pointer ${className}`}>
                <div className="hidden sm:block md:hidden">
                  {ellipse(address, parseInt(ellipseLength / 2), prefix)}
                </div>
                <div className="block sm:hidden md:block">
                  {ellipse(address, ellipseLength, prefix)}
                </div>
              </div>
            }
          />     
  )
}