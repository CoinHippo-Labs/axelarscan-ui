import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Card, CardBody, CardFooter, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../spinner'
import NumberDisplay from '../number'
import Image from '../image'
import { getInflation } from '../../lib/api/axelar'
import { numberFormat } from '../../lib/utils'

const METRICS = ['block', 'avg_block_time', 'validators', 'staked', 'apr', 'inflation']
const DATE_FORMAT = 'MMM D, YYYY h:mm:ss A z'

export default () => {
  const {
    chains,
    chain,
    status,
    validators,
  } = useSelector(
    state => (
      {
        chains: state.chains,
        chain: state.chain,
        status: state.status,
        validators: state.validators,
      }
    ),
    shallowEqual,
  )
  const { chains_data } = { ...chains }
  const { chain_data } = { ...chain }
  const { status_data } = { ...status }
  const { validators_data } = { ...validators }

  const [inflationData, setInflationData] = useState(null)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => setInflationData(await getInflation())
      getData()
    },
    [],
  )

  useEffect(
    () => {
      if (chain_data && status_data) {
        const { bank_supply, staking_pool } = { ...chain_data }
        const { symbol, amount } = { ...bank_supply }
        const { bonded_tokens } = { ...staking_pool }
        setData({
          block_data: status_data,
          num_validators_data: validators_data && { active: validators_data.filter(v => v.status === 'BOND_STATUS_BONDED').length, total: validators_data.length },
          token_data: bank_supply && staking_pool && { symbol, staked: bonded_tokens, total_supply: amount },
          inflation_data: inflationData,
        })
      }
    },
    [chain_data, status_data, validators_data, inflationData],
  )

  const { block_data, num_validators_data, token_data, inflation_data } = { ...data }
  const { latest_block_height, latest_block_time, avg_block_time } = { ...block_data }
  const { active, total } = { ...num_validators_data }
  const { symbol, staked, total_supply } = { ...token_data }
  const { communityTax, inflation } = { ...inflation_data }

  const render = id => {
    const valueClassName = 'text-black dark:text-white text-3xl lg:text-2xl 2xl:text-3xl font-semibold'
    const titleClassName = 'whitespace-nowrap text-blue-400 dark:text-blue-500 text-base'

    let title
    let url
    let loading
    let tooltip
    let component

    switch (id) {
      case 'block':
        title = 'Latest block'
        url = `/block${latest_block_height ? `/${latest_block_height}` : 's'}`
        loading = !latest_block_height
        tooltip = moment(latest_block_time).format(DATE_FORMAT)
        component = (
          <div>
            <NumberDisplay
              value={latest_block_height}
              format="0,0"
              className={valueClassName}
            />
          </div>
        )
        break
      case 'avg_block_time':
        title = 'Avg. block time'
        url = '/blocks'
        loading = !latest_block_height
        tooltip = 'The average block time from the last 100 blocks'
        component = (
          <div>
            <NumberDisplay
              value={avg_block_time}
              format="0,0.00"
              suffix=" sec"
              className={valueClassName}
            />
          </div>
        )
        break
      case 'validators':
        title = 'Validators'
        url = '/validators'
        loading = !validators_data
        tooltip = `${active} active validators out of ${total}`
        component = (
          <div>
            <NumberDisplay
              value={active}
              format="0,0"
              className={valueClassName}
            />
          </div>
        )
        break
      case 'staked':
        title = 'Staked tokens'
        url = '/validators'
        loading = !token_data
        tooltip = `${numberFormat(staked * 100 / total_supply, '0,0.00')}% staked tokens from ${numberFormat(total_supply, '0,0.00a')} ${symbol}`
        component = (
          <div className={valueClassName}>
            <NumberDisplay
              value={staked}
              format="0,0a"
              noTooltip={true}
              className={valueClassName}
            />
            /
            <NumberDisplay
              value={total_supply}
              format="0,0a"
              noTooltip={true}
              className={valueClassName}
            />
          </div>
        )
        break
      case 'apr':
        title = 'Staking APR'
        url = 'https://wallet.keplr.app/chains/axelar'
        loading = !(token_data && inflation && staked)
        tooltip = 'Annual Percentage Rate (APR): % inflation * total supply * (1 - community tax) * (1 - commission rate) / staked tokens'
        component = (
          <div>
            <NumberDisplay
              value={(inflation * 100) * total_supply * (1 - communityTax) * (1 - 0.05) / staked}
              format="0,0.00"
              suffix="%"
              noTooltip={true}
              className={valueClassName}
            />
          </div>
        )
        break
      case 'inflation':
        title = 'Inflation'
        url = '/validators'
        loading = !inflation
        tooltip = '% network inflation + (inflation for EVM chains * # EVM chains)'
        component = (
          <div>
            <NumberDisplay
              value={inflation * 100}
              format="0,0.00"
              suffix="%"
              noTooltip={true}
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
    <div className="space-y-4 sm:space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
        <span className="uppercase text-base font-semibold">
          Axelar Network Status
        </span>
        <div className="flex items-center justify-between sm:justify-end">
          {process.env.NEXT_PUBLIC_TOKEN_INFO_URL && (
            <a
              href={process.env.NEXT_PUBLIC_TOKEN_INFO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 mr-4"
            >
              <div className="min-w-fit">
                <div className="block dark:hidden">
                  <Image
                    src="/logos/logo.png"
                    width={14}
                    height={14}
                  />
                </div>
                <div className="hidden dark:block">
                  <Image
                    src="/logos/logo_white.png"
                    width={14}
                    height={14}
                  />
                </div>
              </div>
              <span className="whitespace-nowrap text-blue-400 dark:text-blue-500">
                AXL token info guides
              </span>
            </a>
          )}
          {process.env.NEXT_PUBLIC_WEBSITE_URL && (
            <a
              href={process.env.NEXT_PUBLIC_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap text-blue-400 dark:text-blue-500"
            >
              Learn more about Axelar
            </a>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {METRICS.map(m => render(m))}
      </div>
    </div>
  )
}