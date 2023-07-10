import Link from 'next/link'
import { Card, CardBody, CardFooter, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import NetworkGraph from './network-graph'
import Spinner from '../spinner'
import NumberDisplay from '../number'
import Image from '../image'
import { toArray } from '../../lib/utils'

const METRICS = ['transactions', 'volumes', 'contracts', 'chains']

const Detail = ({ title, children }) => {
  return (
    <div className="flex flex-col">
      <span className="whitespace-nowrap text-xs">
        {title}
      </span>
      {children}
    </div>
  )
}

export default ({ data }) => {
  const { GMPStats, GMPTotalVolume, transfersStats, transfersTotalVolume, networkGraph, chains_data } = { ...data }
  const { messages } = { ...GMPStats }

  const render = id => {
    const valueClassName = 'text-black dark:text-white text-3xl lg:text-2xl 2xl:text-3xl font-semibold'
    const titleClassName = 'whitespace-nowrap text-blue-400 dark:text-blue-500 text-base'

    let gmp
    let transfers
    let total_transfers

    let title
    let url
    let loading
    let tooltip
    let component

    switch (id) {
      case 'transactions':
        gmp = _.sumBy(messages, 'num_txs') || 0
        transfers = transfersStats?.total || 0
        total_transfers = gmp + transfers
        title = 'Transactions'
        url = '/interchain-transfers'
        loading = !GMPStats
        tooltip = (
          <div className="grid grid-cols-2 gap-4">
            <Detail title="GMP">
              <NumberDisplay
                value={gmp}
                format="0,0"
                className="font-medium"
              />
            </Detail>
            <Detail title="TRANSFERS">
              <NumberDisplay
                value={transfers}
                format="0,0"
                className="font-medium"
              />
            </Detail>
          </div>
        )
        component = (
          <div>
            <NumberDisplay
              value={total_transfers}
              format="0,0"
              className={valueClassName}
            />
          </div>
        )
        break
      case 'volumes':
        gmp = GMPTotalVolume || 0
        transfers = transfersTotalVolume || 0
        total_transfers = gmp + transfers
        title = 'Volumes'
        url = '/interchain-transfers'
        loading = !(typeof GMPTotalVolume === 'number' || typeof transfersTotalVolume === 'number')
        tooltip = (
          <div className="grid grid-cols-2 gap-4">
            <Detail title="GMP">
              <NumberDisplay
                value={gmp}
                format="0,0"
                prefix="$"
                noTooltip={true}
                className="font-medium"
              />
            </Detail>
            <Detail title="TRANSFERS">
              <NumberDisplay
                value={transfers}
                format="0,0"
                prefix="$"
                noTooltip={true}
                className="font-medium"
              />
            </Detail>
          </div>
        )
        component = (
          <div>
            <NumberDisplay
              value={total_transfers}
              format="0,0.00a"
              prefix="$"
              noTooltip={true}
              className={`sm:hidden ${valueClassName}`}
            />
            <NumberDisplay
              value={total_transfers}
              format="0,0"
              prefix="$"
              noTooltip={true}
              className={`hidden sm:block ${valueClassName}`}
            />
          </div>
        )
        break
      case 'contracts':
        const contracts =
          Object.entries(
            _.groupBy(
              toArray(messages).flatMap(m =>
                toArray(m.source_chains).flatMap(s =>
                  toArray(s.destination_chains).flatMap(d =>
                    toArray(d.contracts).map(c => {
                      return {
                        chain: d.key,
                        address: c.key.toLowerCase(),
                      }
                    })
                  )
                )
              ),
              'address',
            )
          )
          .map(([k, v]) => {
            return {
              address: k,
              chains: _.uniq(v.map(_v => _v.chain)),
            }
          })
        title = 'Interchain Contracts'
        url = '/interchain-transfers'
        loading = !GMPStats
        tooltip = 'Total Interchain Contracts'
        component = (
          <div>
            <NumberDisplay
              value={contracts.length}
              format="0,0"
              className={valueClassName}
            />
          </div>
        )
        break
      case 'chains':
        const chains = toArray(chains_data).filter(c => !c.deprecated && (!c.maintainer_id || !c.no_inflation || c.gateway_address))
        title = 'Connected Chains'
        url = '/interchain-transfers'
        loading = !chains_data
        tooltip = chains.length > 0 && (
          <div className="w-64 flex flex-wrap items-center mt-1">
            {chains.map((c, i) => {
              const { name, image } = { ...c }
              return (
                <div key={i} className="mb-1 mr-1">
                  <Tooltip content={name}>
                    <div>
                      <Image
                        src={image}
                        width={20}
                        height={20}
                        className="3xl:w-6 3xl:h-6 rounded-full"
                      />
                    </div>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        )
        component = (
          <div>
            <NumberDisplay
              value={chains.length}
              format="0,0"
              className={valueClassName}
            />
          </div>
        )
        break
      default:
        break
    }

    return (
      <Link key={id} href={url}>
        <Card className="card">
          <CardBody className="mt-0.5 pt-4 2xl:pt-6 pb-1 2xl:pb-2 px-4 2xl:px-6">
            {!loading ?
              tooltip ?
                <Tooltip placement="top-start" content={tooltip}>
                  {component}
                </Tooltip> :
                component :
              <Spinner name="ProgressBar" width={36} height={36} />
            }
          </CardBody>
          <CardFooter className="card-footer pb-4 2xl:pb-6 px-4 2xl:px-6">
            <span className={titleClassName}>
              {title}
            </span>
          </CardFooter>
        </Card>
      </Link>
    )
  }

  return (
    <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div className="sm:mt-4 space-y-4 sm:space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <span className="uppercase text-base font-semibold">
            Interchain Transfers
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
          {METRICS.map(m => render(m))}
        </div>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <NetworkGraph data={networkGraph} />
      </div>
    </div>
  )
}