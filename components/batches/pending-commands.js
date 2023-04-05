import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { ProgressBar, ColorRing } from 'react-loader-spinner'
import { MdRefresh } from 'react-icons/md'
import { BiRightArrowCircle } from 'react-icons/bi'
import { TiArrowRight } from 'react-icons/ti'

import Modal from '../modals'
import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import Image from '../image'
import Copy from '../copy'
import { pending_commands } from '../../lib/api/lcd'
import { getChain } from '../../lib/object/chain'
import { number_format, ellipse, equalsIgnoreCase, loader_color } from '../../lib/utils'

export default (
  {
    chain_data,
  },
) => {
  const {
    preferences,
    evm_chains,
    assets,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    evm_chains_data,
  } = { ...evm_chains }
  const {
    assets_data,
  } = { ...assets }

  const [data, setData] = useState(null)
  const [fetching, setFetching] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(null)

  useEffect(
    () => {
      const getData = async is_interval => {
        if (chain_data) {
          setFetching(true)

          if (!is_interval) {
            setData(null)
          }

          const {
            id,
          } = { ...chain_data }

          const response =
            await pending_commands(
              id,
            )

          const {
            commands,
          } = { ...response }

          setData(
            commands ||
            []
          )

          setFetching(false)
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(true),
          0.25 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [chain_data, fetchTrigger],
  )

  const {
    chain_id,
    name,
    image,
    explorer,
  } = { ...chain_data }

  const {
    key_id,
  } = {
    ...(
      (data || [])
        .find(d =>
          d?.key_id
        )
    ),
  }

  const refreshButton =
    (
      <button
        disabled={!data}
        onClick={() =>
          setFetchTrigger(
            moment()
              .valueOf()
          )
        }
        className={`${!data ? 'cursor-not-allowed text-slate-400 dark:text-slate-600' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'} rounded-full ml-auto p-1.5`}
      >
        {data ?
          <MdRefresh
            size={16}
          /> :
          <ColorRing
            color={loader_color(theme)}
            width="16"
            height="16"
          />
        }
      </button>
    )

  return (
    <Modal
      buttonTitle={
        <div className="flex items-center space-x-1">
          {
            image &&
            (
              <Image
                src={image}
                className="w-4 h-4 rounded-full"
              />
            )
          }
          {
            data &&
            (
              <span className="text-xs font-semibold">
                (
                {number_format(
                  data.length ||
                  0,
                  '0,0',
                )}
                )
              </span>
            )
          }
          {
            fetching &&
            (
              <ColorRing
                color={loader_color(theme)}
                width="16"
                height="16"
              />
            )
          }
        </div>
      }
      buttonClassName="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded space-x-1.5 py-1 px-2"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {
              image &&
              (
                <Image
                  src={image}
                  className="w-7 h-7 rounded-full"
                />
              )
            }
            <span className="tracking-wider text-base font-semibold">
              {
                key_id ||
                name
              }
            </span>
          </div>
          {refreshButton}
        </div>
      }
      body={
        data ?
          <div className="space-y-3">
            <Datatable
              columns={
                [
                  {
                    Header: 'Command ID',
                    accessor: 'id',
                    disableSortBy: true,
                    Cell: props => {
                      const {
                        value,
                      } = { ...props }
                      const {
                        transactionHash,
                      } = { ...props.row.original }

                      return (
                        <div className="flex items-center space-x-1">
                          {
                            transactionHash &&
                            explorer ?
                              <a
                                href={`${explorer.url}${explorer.transaction_path?.replace('{tx}', transactionHash)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                              >
                                {ellipse(
                                  value,
                                  8,
                                )}
                              </a> :
                              <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                                {ellipse(
                                  value,
                                  8,
                                )}
                              </span>
                          }
                          <Copy
                            value={value}
                          />
                        </div>
                      )
                    },
                    headerClassName: 'whitespace-nowrap',
                  },
                  {
                    Header: 'Type',
                    accessor: 'type',
                    disableSortBy: true,
                    Cell: props => {
                      const {
                        value,
                      } = { ...props }
                      const {
                        transactionHash,
                        executed,
                      } = { ...props.row.original }

                      const typeComponent =
                        (
                          <div
                            title={executed ?
                              'Executed' :
                              ''
                            }
                            className={`w-fit max-w-min ${executed ? 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700 font-semibold py-0.5 px-1.5' : 'bg-slate-100 dark:bg-slate-900 font-medium py-1 px-2'} rounded-lg capitalize text-xs`}
                          >
                            {value}
                          </div>
                        )

                      return (
                        value ?
                          typeComponent &&
                          (
                            transactionHash &&
                            explorer ?
                              <a
                                href={`${explorer.url}${explorer.transaction_path?.replace('{tx}', transactionHash)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                              >
                                {typeComponent}
                              </a> :
                              typeComponent
                          ) :
                          <span className="text-slate-400 dark:text-slate-600">
                            Unknown
                          </span>
                      )
                    },
                  },
                  {
                    Header: 'Params',
                    accessor: 'params.account',
                    disableSortBy: true,
                    Cell: props => {
                      const {
                        value,
                      } = { ...props }
                      const {
                        id,
                        params,
                        type,
                        deposit_address,
                      } = { ...props.row.original }
                      const {
                        salt,
                        newOwners,
                        newOperators,
                        newWeights,
                        name,
                        decimals,
                        cap,
                        sourceChain,
                        sourceTxHash,
                        contractAddress,
                      } = { ...params }

                      const source_chain_data =
                        getChain(
                          sourceChain,
                          evm_chains_data,
                        )

                      const transfer_id =
                        parseInt(
                          id,
                          16,
                        )

                      return (
                        value ?
                          <div className="flex items-center space-x-1">
                            {
                              [
                                'mintToken',
                              ].includes(type) &&
                              typeof transfer_id === 'number' &&
                              (
                                <div className="flex items-center space-x-1">
                                  <Link href={`/transfer?transfer_id=${transfer_id}`}>
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                    >
                                      Transfer
                                    </a>
                                  </Link>
                                </div>
                              )
                            }
                            <EnsProfile
                              address={value}
                              fallback={
                                value &&
                                (
                                  <Copy
                                    value={value}
                                    title={
                                      <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-sm">
                                        <span className="xl:hidden">
                                          {ellipse(
                                            value,
                                            6,
                                          )}
                                        </span>
                                        <span className="hidden xl:block">
                                          {ellipse(
                                            value,
                                            8,
                                          )}
                                        </span>
                                      </span>
                                    }
                                  />
                                )
                              }
                            />
                            {
                              explorer?.url &&
                              (
                                <a
                                  href={`${explorer.url}${explorer.address_path?.replace('{address}', value)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                >
                                  {explorer.icon ?
                                    <Image
                                      src={explorer.icon}
                                      className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                    /> :
                                    <TiArrowRight
                                      size={16}
                                      className="transform -rotate-45"
                                    />
                                  }
                                </a>
                              )
                            }
                          </div> :
                          source_chain_data ?
                            <div className="flex items-center space-x-2">
                              {source_chain_data.image ?
                                <Image
                                  src={source_chain_data.image}
                                  className="w-5 h-5 rounded-full"
                                /> :
                                <span className="font-medium">
                                  {source_chain_data.name}
                                </span>
                              }
                              {
                                sourceTxHash &&
                                (
                                  <div className="flex items-center space-x-1">
                                    <Link href={`/gmp/${sourceTxHash}`}>
                                      <a
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                                      >
                                        GMP
                                      </a>
                                    </Link>
                                    {
                                      source_chain_data.explorer?.url &&
                                      (
                                        <a
                                          href={`${source_chain_data.explorer.url}${source_chain_data.explorer.transaction_path?.replace('{tx}', sourceTxHash)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                        >
                                          {source_chain_data.explorer.icon ?
                                            <Image
                                              src={source_chain_data.explorer.icon}
                                              className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                            /> :
                                            <TiArrowRight
                                              size={16}
                                              className="transform -rotate-45"
                                            />
                                          }
                                        </a>
                                      )
                                    }
                                  </div>
                                )
                              }
                              {
                                contractAddress &&
                                (
                                  <>
                                    <BiRightArrowCircle
                                      size={18}
                                    />
                                    <div className="flex items-center space-x-1">
                                      <EnsProfile
                                        address={contractAddress}
                                        fallback={
                                          contractAddress &&
                                          (
                                            <Copy
                                              value={contractAddress}
                                              title={
                                                <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-sm">
                                                  <span className="xl:hidden">
                                                    {ellipse(
                                                      contractAddress,
                                                      6,
                                                    )}
                                                  </span>
                                                  <span className="hidden xl:block">
                                                    {ellipse(
                                                      contractAddress,
                                                      8,
                                                    )}
                                                  </span>
                                                </span>
                                              }
                                            />
                                          )
                                        }
                                      />
                                      {
                                        explorer?.url &&
                                        (
                                          <a
                                            href={`${explorer.url}${explorer.address_path?.replace('{address}', contractAddress)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                          >
                                            {explorer.icon ?
                                              <Image
                                                src={explorer.icon}
                                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                              /> :
                                              <TiArrowRight
                                                size={16}
                                                className="transform -rotate-45"
                                              />
                                            }
                                          </a>
                                        )
                                      }
                                    </div>
                                  </>
                                )
                              }
                            </div> :
                            salt ?
                              <div className="flex items-center space-x-1">
                                <span className="text-slate-400 dark:text-slate-600 font-medium">
                                  {deposit_address ?
                                    'Deposit address' :
                                    'Salt'
                                  }:
                                </span>
                                {deposit_address ?
                                  <>
                                    <a
                                      href={`/account/${deposit_address}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 dark:text-slate-600 text-xs font-medium"
                                    >
                                      {ellipse(
                                        deposit_address,
                                        8,
                                      )}
                                    </a>
                                    <Copy
                                      value={deposit_address}
                                    />
                                  </> :
                                  <Copy
                                    value={salt}
                                    title={
                                      <span className="text-slate-400 dark:text-slate-600 text-xs font-medium">
                                        {ellipse(
                                          salt,
                                          8,
                                        )}
                                      </span>
                                    }
                                  />
                                }
                              </div> :
                              newOwners ||
                              newOperators ?
                                <>
                                  {
                                    newWeights &&
                                    (
                                      <div className="flex items-center space-x-1 mb-1">
                                        <span className="text-slate-400 dark:text-slate-600 font-medium">
                                          Weight:
                                        </span>
                                        <span className="font-medium">
                                          [
                                          {number_format(
                                            _.sum(
                                              newWeights
                                                .split(';')
                                                .map(w =>
                                                  Number(w)
                                                )
                                            ),
                                            '0,0',
                                          )}
                                          ]
                                        </span>
                                      </div>
                                    )
                                  }
                                  <div className="max-w-xl flex flex-wrap">
                                    {
                                      (
                                        newOwners ||
                                        newOperators
                                      )
                                      .split(';')
                                      .map((o, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center space-x-1 mb-1 mr-3"
                                        >
                                          <EnsProfile
                                            address={o}
                                            fallback={
                                              o &&
                                              (
                                                <Copy
                                                  value={o}
                                                  title={
                                                    <span className="cursor-pointer text-slate-400 dark:text-slate-200 text-sm">
                                                      <span className="xl:hidden">
                                                        {ellipse(
                                                          o,
                                                          6,
                                                        )}
                                                      </span>
                                                      <span className="hidden xl:block">
                                                        {ellipse(
                                                          o,
                                                          8,
                                                        )}
                                                      </span>
                                                    </span>
                                                  }
                                                />
                                              )
                                            }
                                          />
                                          {
                                            explorer?.url &&
                                            (
                                              <a
                                                href={`${explorer.url}${explorer.address_path?.replace('{address}', o)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="min-w-max text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                                              >
                                                {explorer.icon ?
                                                  <Image
                                                    src={explorer.icon}
                                                    className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                                  /> :
                                                  <TiArrowRight
                                                    size={16}
                                                    className="transform -rotate-45"
                                                  />
                                                }
                                              </a>
                                            )
                                          }
                                          {
                                            newWeights &&
                                            (
                                              <span className="font-medium">
                                                [
                                                {number_format(
                                                  newWeights
                                                    .split(';')[i],
                                                  '0,0',
                                                )}
                                                ]
                                              </span>
                                            )
                                          }
                                        </div>
                                      ))}
                                  </div>
                                </> :
                                name ?
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {name}
                                    </span>
                                    <div className="flex items-center space-x-1.5">
                                      {
                                        decimals &&
                                        (
                                          <span className="text-slate-400 dark:text-slate-600 text-xs space-x-1">
                                            <span className="font-medium">
                                              decimals:
                                            </span>
                                            <span>
                                              {number_format(
                                                decimals,
                                                '0,0',
                                              )}
                                            </span>
                                          </span>
                                        )
                                      }
                                      {
                                        cap &&
                                        (
                                          <span className="text-slate-400 dark:text-slate-600 text-xs space-x-1">
                                            <span className="font-medium">
                                              cap:
                                            </span>
                                            <span>
                                              {number_format(
                                                cap,
                                                '0,0',
                                              )}
                                            </span>
                                          </span>
                                        )
                                      }
                                    </div>
                                  </div> :
                                  <span className="text-slate-400 dark:text-slate-600">
                                    Unknown
                                  </span>
                      )
                    },
                  },
                  {
                    Header: 'Amount',
                    accessor: 'params.amount',
                    disableSortBy: true,
                    Cell: props => {
                      const {
                        params,
                      } = { ...props.row.original }
                      let {
                        symbol,
                        amount,
                        newThreshold,
                      } = { ...params }

                      const asset_data = (assets_data || [])
                        .find(a =>
                          equalsIgnoreCase(
                            a?.symbol,
                            symbol,
                          ) ||
                          (a?.contracts || [])
                            .findIndex(c =>
                              c?.chain_id === chain_id &&
                              equalsIgnoreCase(
                                c.symbol,
                                symbol,
                              )
                            ) > -1
                        )
                      const {
                        contracts,
                      } = { ...asset_data }

                      const contract_data = (contracts || [])
                        .find(c =>
                          c?.chain_id === chain_id
                        )

                      let {
                        decimals,
                        image,
                      } = { ...contract_data }

                      decimals =
                        decimals ||
                        asset_data?.decimals ||
                        18

                      symbol =
                        contract_data?.symbol ||
                        asset_data?.symbol ||
                        symbol

                      image =
                        image ||
                        asset_data?.image

                      return (
                        <div className="flex items-center space-x-2">
                          {symbol ?
                            <div className="min-w-max max-w-min flex items-center justify-center sm:justify-end space-x-1.5">
                              {
                                image &&
                                (
                                  <Image
                                    src={image}
                                    className="w-5 h-5 rounded-full"
                                  />
                                )
                              }
                              <span className="text-sm font-medium">
                                {
                                  amount > 0 &&
                                  (
                                    <span className="mr-1">
                                      {number_format(
                                        utils.formatUnits(
                                          BigNumber.from(
                                            amount
                                          ),
                                          decimals,
                                        ),
                                        '0,0.000000',
                                        true,
                                      )}
                                    </span>
                                  )
                                }
                                <span>
                                  {symbol}
                                </span>
                              </span>
                            </div> :
                            newThreshold &&
                            (
                              <div className="flex items-center space-x-1">
                                <span className="font-medium">
                                  Threshold:
                                </span>
                                <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                                  {number_format(
                                    newThreshold,
                                    '0,0',
                                  )}
                                </span>
                              </div>
                            )
                          }
                        </div>
                      )
                    },
                  },
                  {
                    Header: 'Max Gas Cost',
                    accessor: 'max_gas_cost',
                    disableSortBy: true,
                    Cell: props => (
                      <div className="font-medium text-right">
                        {number_format(
                          props.value,
                          '0,0.00000000',
                          true,
                        )}
                      </div>
                    ),
                    headerClassName: 'whitespace-nowrap justify-end text-right',
                  },
                ]
              }
              data={data}
              noPagination={data.length <= 10}
              defaultPageSize={10}
              className="min-h-full small no-border"
            />
          </div> :
          <div className="w-80 sm:w-96">
            <ProgressBar
              borderColor={loader_color(theme)}
              width="32"
              height="32"
            />
          </div>
      }
      confirmButtonTitle="Ok"
      modalClassName="max-w-fit"
    />
  )
}