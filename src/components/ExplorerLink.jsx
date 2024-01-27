import Link from 'next/link'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import clsx from 'clsx'

import Image from '@/components/Image'
import { useGlobalStore } from '@/app/providers'
import { getChainData } from '@/lib/config'
import { getInputType } from '@/lib/parser'

export function ExplorerLink({
  value,
  chain,
  type = 'tx',
  customURL,
  hasEventLog,
  title,
  iconOnly = true,
  width = 16,
  height = 16,
  containerClassName,
  nonIconClassName,
  className,
}) {
  const { chains } = useGlobalStore()
  const { explorer } = { ...getChainData(chain, chains) }
  const { url, name, address_path, contract_path, contract_0_path, transaction_path, icon } = { ...explorer }
  if (type === 'tx' && getInputType(value, chains) === 'evmAddress') type = 'address'

  let path
  let field = type
  switch (type) {
    case 'address':
      path = address_path
      break
    case 'contract':
      path = (value === ZeroAddress && contract_0_path) || contract_path
      field = 'address'
      break
    case 'tx':
      path = transaction_path
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
        width={width}
        height={height}
        className={clsx('rounded-full opacity-60 hover:opacity-100', className)}
      />
    </Link>
  )
}
