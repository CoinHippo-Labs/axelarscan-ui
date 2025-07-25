'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Container } from '@/components/Container'
import { Copy } from '@/components/Copy'
import { Spinner } from '@/components/Spinner'
import { Number } from '@/components/Number'
import { Profile } from '@/components/Profile'
import { TimeAgo } from '@/components/Time'
import { searchBlocks } from '@/lib/api/validator'
import { toBoolean, ellipse } from '@/lib/string'
import { numberFormat } from '@/lib/number'

const SIZE = 250

export function Blocks({ height }) {
  const [data, setData] = useState(null)
  const [refresh, setRefresh] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (toBoolean(refresh)) {
        const { data } = { ...await searchBlocks({ height, size: SIZE }) }

        if (data) {
          setData(data)
          setRefresh(false)
        }
      }
    }

    getData()
  }, [height, setData, refresh, setRefresh])

  useEffect(() => {
    const interval = setInterval(() => setRefresh(true), 6 * 1000)
    return () => clearInterval(interval)
  }, [setRefresh])

  return (
    <Container className="sm:mt-8">
      {!data ? <Spinner /> :
        <div>
          <div className="sm:flex-auto">
            <h1 className="text-zinc-900 dark:text-zinc-100 text-base font-semibold leading-6">
              Blocks
            </h1>
            <p className="mt-2 text-zinc-400 dark:text-zinc-500 text-sm">
              Latest {numberFormat(SIZE, '0,0')} Blocks
            </p>
          </div>
          <div className="overflow-x-auto lg:overflow-x-visible -mx-4 sm:-mx-0 mt-4">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                <tr className="text-zinc-800 dark:text-zinc-200 text-sm font-semibold">
                  <th scope="col" className="pl-4 sm:pl-0 pr-3 py-3.5 text-left">
                    Height
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Hash
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left">
                    Proposer
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-3.5 text-right">
                    No. Transactions
                  </th>
                  <th scope="col" className="pl-3 pr-4 sm:pr-0 py-3.5 text-right">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.map((d, i) => (
                  <tr key={d.height} className="align-top text-zinc-400 dark:text-zinc-500 text-sm">
                    <td className="pl-4 sm:pl-0 pr-3 py-4 text-left">
                      <div className="flex flex-col gap-y-0.5">
                        <Copy value={d.height}>
                          <Link
                            href={`/block/${d.height}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 font-semibold"
                          >
                            <Number value={d.height} />
                          </Link>
                        </Copy>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-left">
                      {d.hash && (
                        <Copy value={d.hash}>
                          <Link
                            href={`/block/${d.height}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-500 font-medium"
                          >
                            {ellipse(d.hash)}
                          </Link>
                        </Copy>
                      )}
                    </td>
                    <td className="px-3 py-4 text-left">
                      <Profile i={i} address={d.proposer_address} />
                    </td>
                    <td className="px-3 py-4 text-right">
                      <Number value={d.num_txs} className="text-zinc-700 dark:text-zinc-300 font-medium" />
                    </td>
                    <td className="pl-3 pr-4 sm:pr-0 py-4 flex items-center justify-end text-right">
                      <TimeAgo timestamp={d.time} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    </Container>
  )
}
