import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import Widget from '../widget'
import Copy from '../copy'

import { chain_manager } from '../../lib/object/chain'
import { numberFormat } from '../../lib/utils'

export default function EVMSpecific({ supportedChains, evmVotes, validator_data }) {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <Widget
      title={<span className="text-lg font-medium">EVMs Support</span>}
      className="dark:border-gray-900"
    >
      <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 text-base sm:text-sm lg:text-base gap-4 mt-3 mb-0.5">
        <div className="sm:col-span-2 flex flex-col space-y-1">
          <span className="font-semibold space-x-2">
            <span>Chains Supported</span>
          </span>
          {supportedChains ?
            <span className="flex flex-wrap items-center text-gray-500 dark:text-gray-400">
              {supportedChains.length > 0 ?
                supportedChains.map((id, i) => (
                  <span key={i} className="min-w-max max-w-min bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center text-gray-800 dark:text-gray-200 text-2xs font-semibold space-x-1 px-2 py-1 my-1 mr-2">
                    {chain_manager.image(id, chains_data) && (
                      <img
                        alt=""
                        src={chain_manager.image(id, chains_data)}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span className="whitespace-nowrap">{chain_manager.title(id, chains_data)}</span>
                  </span>
                ))
                :
                '-'
              }
            </span>
            :
            <div className="skeleton w-full h-6" />
          }
        </div>
        <div className="sm:col-span-2 flex flex-col space-y-1">
          <div className="w-full flex items-center justify-between font-semibold space-x-2.5 mb-4 sm:mb-2">
            <span className="whitespace-nowrap">EVM Votes</span>
            {Object.keys(evmVotes?.data?.chains || {}).length > 0 && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center text-xs sm:text-sm space-y-1 sm:space-y-0 space-x-2">
                <span className="capitalize">Total:</span>
                <div className="flex flex-col sm:flex-row items-end sm:items-center uppercase space-y-0.5 sm:space-y-0 space-x-1">
                  <Link href={`/evm-votes?vote=yes${validator_data?.broadcaster_address ? `&voter=${validator_data.broadcaster_address}` : ''}`}>
                    <a className="text-green-500 font-semibold space-x-1">
                      <span className="font-mono">
                        {numberFormat(_.sum(Object.values(evmVotes.data.chains).map(v => v?.confirms?.true)) || 0, '0,0')}
                      </span>
                      <span>Yes</span>
                    </a>
                  </Link>
                  <span className="hidden sm:block text-gray-400 dark:text-gray-600 font-semibold">:</span>
                  <Link href={`/evm-votes?vote=no${validator_data?.broadcaster_address ? `&voter=${validator_data.broadcaster_address}` : ''}`}>
                    <a className="text-red-500 font-semibold space-x-1">
                      <span className="font-mono">
                        {numberFormat(_.sum(Object.values(evmVotes.data.chains).map(v => v?.confirms?.false)) || 0, '0,0')}
                      </span>
                      <span>No</span>
                    </a>
                  </Link>
                  <span className="hidden sm:block text-gray-400 dark:text-gray-600 font-semibold">:</span>
                  <span className="text-gray-400 dark:text-gray-600 font-semibold space-x-1">
                    <span className="font-mono">
                      {numberFormat((_.sum(Object.values(evmVotes.all_data || {})) || 0) - _.sum(Object.values(evmVotes.data.chains).map(v => (v?.confirms?.false || 0) + (v?.confirms?.true || 0))), '0,0')}
                    </span>
                    <span>Unsubmitted</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          {evmVotes?.data?.chains ?
            <span className="flex flex-wrap items-center text-gray-500 dark:text-gray-400">
              {Object.keys(evmVotes.data.chains).length > 0 ?
                <div className="w-full grid grid-flow-row grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-3 gap-x-5">
                  {Object.entries(evmVotes.data.chains).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between space-x-2">
                      <Link href={`/evm-votes?chain=${key}${validator_data?.broadcaster_address ? `&voter=${validator_data.broadcaster_address}` : ''}`}>
                        <a>
                          <img
                            src={chain_manager.image(key, chains_data)}
                            alt={chain_manager.title(key, chains_data)}
                            className="w-6 h-6 rounded-full"
                          />
                        </a>
                      </Link>
                      <div className="flex flex-col items-end space-y-1">
                        <div className="flex items-center uppercase text-3xs md:text-xs space-x-1">
                          <Link href={`/evm-votes?chain=${key}&vote=yes${validator_data?.broadcaster_address ? `&voter=${validator_data.broadcaster_address}` : ''}`}>
                            <a className="text-green-500 font-semibold space-x-0.5">
                              <span className="font-mono">
                                {numberFormat(value?.confirms?.true || 0, '0,0')}
                              </span>
                              <span>Y</span>
                            </a>
                          </Link>
                          <span className="text-gray-400 dark:text-gray-600 font-semibold">:</span>
                          <Link href={`/evm-votes?chain=${key}&vote=no${validator_data?.broadcaster_address ? `&voter=${validator_data.broadcaster_address}` : ''}`}>
                            <a className={`${value?.confirms?.false > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-600'} font-semibold space-x-0.5`}>
                              <span className="font-mono">
                                {numberFormat(value?.confirms?.false || 0, '0,0')}
                              </span>
                              <span>N</span>
                            </a>
                          </Link>
                        </div>
                        {Object.keys(evmVotes.all_data || {}).length > 0 && (
                          <Link href={`/evm-votes?chain=${key}${validator_data?.broadcaster_address ? `&voter=${validator_data.broadcaster_address}` : ''}`}>
                            <a className="flex items-center text-gray-500 dark:text-gray-300 text-3xs font-semibold space-x-1">
                              <span className="capitalize">Total:</span>
                              <span className="font-mono">
                                {numberFormat(evmVotes.all_data?.[key] || 0, '0,0')}
                              </span>
                            </a>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                :
                '-'
              }
            </span>
            :
            <>
              <div className="skeleton w-full h-6" />
              <div className="skeleton w-full h-6" />
            </>
          }
        </div>
      </div>
    </Widget>
  )
}