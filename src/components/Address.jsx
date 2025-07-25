'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

import { Container } from '@/components/Container'
import { GMPs } from '@/components/GMPs'
import { Transfers } from '@/components/Transfers'
import { getParams, getQueryString } from '@/lib/operator'

const TABS = ['gmp', 'transfers']

export function Address({ address }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [params, setParams] = useState(getParams(searchParams))

  useEffect(() => {
    const params = getParams(searchParams)

    if (address) {
      if (!params.transfersType) {
        setParams({ ...params, transfersType: TABS[0] })
      }
      else {
        setParams(params)
      }
    }
  }, [address, searchParams, setParams])

  useEffect(() => {
    if (address && params) {
      router.push(`/address/${address}${getQueryString(params)}`)
    }
  }, [address, router, params])

  const { transfersType } = { ...params }

  return address && transfersType && (
    <Container className="sm:mt-8">
      <div className="flex flex-col gap-y-6 sm:gap-y-0">
        <nav className="flex gap-x-4">
          {TABS.map((type, i) => (
            <button
              key={i}
              onClick={() => setParams({ transfersType: type })}
              className={clsx(
                'rounded-md px-3 py-2 capitalize text-xs sm:text-base font-medium',
                type === transfersType ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400',
              )}
            >
              {type === 'gmp' ? 'General Message Passing' : type === 'transfers' ? 'Token Transfers' : type}
            </button>
          ))}
        </nav>
        <div className="-mx-4">
          {transfersType === 'gmp' ? <GMPs address={address} /> : <Transfers address={address} />}
        </div>
      </div>
    </Container>
  )
}
