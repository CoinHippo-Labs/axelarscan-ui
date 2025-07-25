'use client'

import Link from 'next/link'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import clsx from 'clsx'

import { Image } from '@/components/Image'
import { useGlobalStore } from '@/components/Global'
import { getChainData } from '@/lib/config'
import { getInputType } from '@/lib/parser'
import { isString } from '@/lib/string'
import { isNumber } from '@/lib/number'

export function ExplorerLink({
  value,
  chain,
  type = 'tx',
  customURL,
  hasEventLog,
  useContractLink,
  title,
  iconOnly = true,
  width = 16,
  height = 16,
  containerClassName,
  nonIconClassName,
  className = 'h-4',
}) {
  const { chains } = useGlobalStore()
  const { explorer } = { ...getChainData(chain, chains) }
  const { url, name, block_path, address_path, contract_path, contract_0_path, transaction_path, icon, no_0x, cannot_link_contract_via_address_path } = { ...explorer }

  if (type === 'tx') {
    // update type from input value
    switch (getInputType(value, chains)) {
      case 'evmAddress':
        type = 'address'
        break
      case 'block':
        if (isNumber(value) && (!isString(value) || !value.startsWith('0x'))) {
          type = 'block'
        }
        break
      default:
        break
    }
  }

  let path
  let field = type

  // set explorer path by input type
  switch (type) {
    case 'address':
      path = useContractLink && cannot_link_contract_via_address_path && contract_path ? contract_path : address_path
      break
    case 'contract':
      path = (value === ZeroAddress && contract_0_path) || contract_path
      field = 'address'
      break
    case 'tx':
      path = transaction_path

      // remove prefix 0x
      if (no_0x && value?.startsWith('0x')) {
        value = value.substring(2)
      }
      break
    case 'block':
      path = block_path
      break
    default:
      break
  }

  return (customURL || (url && value)) && (
    <Link
      href={customURL || `${url}${path?.replace(`{${field}}`, value)}${type === 'tx' && value.startsWith('0x') && hasEventLog ? '#eventlog' : ''}`}
      target="_blank"
      className={clsx('min-w-max flex items-center gap-x-2', containerClassName)}
    >
      {!iconOnly && (
        <span className={clsx('font-medium', nonIconClassName)}>
          {title || `View on ${name}`}
        </span>
      )}
      <Image
        src={icon}
        alt=""
        width={width}
        height={height}
        className={clsx('rounded-full opacity-60 hover:opacity-100', className)}
      />
    </Link>
  )
}
