import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import PropTypes from 'prop-types'

import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'

import Widget from '../widget'
import Copy from '../copy'
import { ProgressBarWithText } from '../progress-bars'

import { chain_manager } from '../../lib/object/chain'
import { numberFormat, getName, ellipseAddress } from '../../lib/utils'

const Summary = ({ data }) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  let ineligibilities = {};

  if (data) {
    for (let i = 0; i < data.length; i++) {
      const validator_data = data[i]

      // for (let j = 0; j < Object.entries(validator_data.ineligibilities).length; j++) {
      //   const [ineligibility, count] = Object.entries(validator_data.ineligibilities)[j]

      //   ineligibilities[ineligibility] = (ineligibilities[ineligibility] || 0) + (count || 0)
      // }

      if (validator_data?.tss_illegibility_info) {
        for (let j = 0; j < validator_data.tss_illegibility_info.length; j++) {
          const ineligibility = validator_data.tss_illegibility_info[j], count = 1
          ineligibilities[ineligibility] = (ineligibilities[ineligibility] || 0) + (count || 0)
        }
      }
    }
  }

  ineligibilities = _.orderBy(Object.entries(ineligibilities).filter(([key, value]) => value).map(([key, value]) => { return { ineligibility: key, count: value } }), ['count'], ['desc'])

  const supportedChains = _.orderBy(Object.entries(_.countBy(data?.filter(v => ['BOND_STATUS_BONDED'].includes(v?.status)).flatMap(v => v.supported_chains) || [])).map(([key, value]) => { return { chain: key, count: value } }), ['count'], ['desc'])

  return (
    <div className="w-full grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 mb-6">
      <Widget
        title="Active Validators"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <span className="h-8 text-3xl font-semibold">{numberFormat(data.filter(v => ['BOND_STATUS_BONDED'].includes(v?.status)).length, '0,0')}</span>
            :
            <div className="skeleton w-24 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span>out of</span>
            {data ?
              <span className="text-gray-600 dark:text-gray-400 font-medium">{numberFormat(data.length, '0,0')}</span>
              :
              <div className="skeleton w-6 h-3.5" />
            }
            <span>validators</span>
          </span>
        </span>
      </Widget>
      <Widget
        title="Total Voting Power"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <span className="h-8 uppercase text-3xl font-semibold">{numberFormat(_.sumBy(data.filter(v => ['BOND_STATUS_BONDED'].includes(v?.status)), 'tokens'), '0,0.00a')}</span>
            :
            <div className="skeleton w-24 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span>Avg. Power:</span>
            {data ?
              <span className="uppercase text-gray-600 dark:text-gray-400 font-medium">{numberFormat(_.meanBy(data.filter(v => ['BOND_STATUS_BONDED'].includes(v?.status)), 'tokens'), '0,0.00a')}</span>
              :
              <div className="skeleton w-8 h-3.5" />
            }
          </span>
        </span>
      </Widget>
      <Widget
        title="Average Uptime"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <span className="h-8 text-3xl font-semibold">
              {numberFormat(_.meanBy(data, 'uptime'), '0,0.00')}
              <span className="text-lg">%</span>
            </span>
            :
            <div className="skeleton w-24 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span>Avg. # Missed Block:</span>
            {data ?
              <span className="text-gray-600 dark:text-gray-400 font-medium">{numberFormat(_.meanBy(data, 'missed_blocks'), '0,0')}</span>
              :
              <div className="skeleton w-8 h-3.5" />
            }
          </span>
        </span>
      </Widget>
      <Widget
        title="Average Heartbeat Uptime"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <span className="h-8 text-3xl font-semibold">
              {numberFormat(_.meanBy(data, 'heartbeats_uptime'), '0,0.00')}
              <span className="text-lg">%</span>
            </span>
            :
            <div className="skeleton w-24 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span>Avg. # Missed Heartbeats:</span>
            {data ?
              <span className="text-gray-600 dark:text-gray-400 font-medium">{numberFormat(_.meanBy(data, 'missed_heartbeats'), '0,0')}</span>
              :
              <div className="skeleton w-8 h-3.5" />
            }
          </span>
        </span>
      </Widget>
      <Widget
        title="Broadcast Registration"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <span className="h-8 text-3xl font-semibold">
              {numberFormat(data.filter(v => v?.broadcaster_registration).length, '0,0')}
              /
              {numberFormat(data.length, '0,0')}
            </span>
            :
            <div className="skeleton w-24 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span>Insuficient Funds:</span>
            {data ?
              <span className="text-gray-600 dark:text-gray-400 font-medium">{numberFormat(data.filter(v => v.broadcaster_funded?.amount < Number(process.env.NEXT_PUBLIC_MIN_BROADCAST_FUND)).length, '0,0')}</span>
              :
              <div className="skeleton w-6 h-3.5" />
            }
            <span>validators</span>
          </span>
        </span>
      </Widget>
      <Widget
        title="Most Ineligibilities"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <span className="h-8 whitespace-pre text-xl font-semibold">
              {getName(_.head(ineligibilities)?.ineligibility || '-')}
            </span>
            :
            <div className="skeleton w-32 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span>following by</span>
            {data ?
              <span className="text-gray-600 dark:text-gray-400 font-medium">{getName(ineligibilities[1]?.ineligibility || '-')}</span>
              :
              <div className="skeleton w-12 h-3.5" />
            }
          </span>
        </span>
      </Widget>
      <Widget
        title="Average Keygen Participations"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <span className="h-8 text-3xl font-semibold">
              {numberFormat(_.meanBy(data.filter(v => v.keygen_participated + v.keygen_not_participated > 0), 'keygen_participated_rate') * 100, '0,0.00')}
              <span className="text-lg">%</span>
            </span>
            :
            <div className="skeleton w-24 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span>Avg. Sign Participations:</span>
            {data ?
              <span className="text-gray-600 dark:text-gray-400 font-medium">{numberFormat(_.meanBy(data.filter(v => v.sign_participated + v.sign_not_participated > 0), 'sign_participated_rate') * 100, '0,0.00')}%</span>
              :
              <div className="skeleton w-8 h-3.5" />
            }
          </span>
        </span>
      </Widget>
      <Widget
        title="Supported Chains"
        className="bg-transparent sm:bg-white sm:dark:bg-gray-900 border-0 sm:border border-gray-100 dark:border-gray-900 p-0 sm:p-4"
      >
        <span className="flex flex-col space-y-1 mt-1">
          {data ?
            <div className="h-8 flex flex-wrap items-center justify-start">
              {supportedChains.map((c, i) => (
                chain_manager.image(c.chain, chains_data) ?
                  <Img
                    key={i}
                    alt={chain_manager.title(c.chain, chains_data)}
                    src={chain_manager.image(c.chain, chains_data)}
                    className="w-6 h-6 rounded-full mb-1 mr-1"
                  />
                  :
                  <span key={i} className="max-w-min bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-800 dark:text-gray-200 text-xs font-semibold mb-1 ml-1 px-1.5 py-0.5">
                    {chain_manager.title(c.chain, chains_data)}
                  </span>
              ))}
            </div>
            :
            <div className="skeleton w-24 h-7 mt-1" />
          }
          <span className="flex items-center text-gray-400 dark:text-gray-600 text-sm font-normal space-x-1">
            <span># {typeof data?.total_votes === 'number' ? 'Total Votes' : 'Chains'}:</span>
            {data ?
              typeof data.total_votes === 'number' ?
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  {numberFormat(data.total_yes_votes, '0,0')} Y / {numberFormat(data.total_no_votes, '0,0')} N
                </span>
                :
                <span className="text-gray-600 dark:text-gray-400 font-medium">{numberFormat(supportedChains.length, '0,0')}</span>
              :
              <div className="skeleton w-8 h-3.5" />
            }
          </span>
        </span>
      </Widget>
    </div>
  )
}

Summary.propTypes = {
  data: PropTypes.any,
}

export default Summary