import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'

import Datatable from '../datatable'
import Image from '../image'
import Copy from '../copy'
import { getContracts } from '../../lib/api/gmp'
import { ellipse, loader_color } from '../../lib/utils'

export default () => {
  const {
    preferences,
    evm_chains,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        evm_chains: state.evm_chains,
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

  const [data, setData] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (evm_chains_data) {
        const response = await getContracts()

        const {
          gateway_contracts,
          gas_service_contracts,
        } = { ...response }

        setData(
          evm_chains_data
            .map(c => {
              const {
                id,
              } = { ...c }

              return {
                id,
                gateway: gateway_contracts?.[id]?.address,
                gas_service: gas_service_contracts?.[id]?.address,
              }
            })
        )
      }
    }

    getData()
  }, [evm_chains_data])

  return (
    <div className="space-y-4 mx-auto pt-2 pb-6">
      {data ?
        <Datatable
          columns={[
            {
              Header: 'Chain',
              accessor: 'id',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  name,
                  image,
                } = { ...evm_chains_data.find(c => c?.id === value) }

                return (
                  <div className="flex items-center space-x-1.5">
                    {image && (
                      <Image
                        src={image}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="font-semibold">
                      {name}
                    </span>
                  </div>
                )
              },
            },
            {
              Header: 'Gateway Address',
              accessor: 'gateway',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  id,
                } = { ...props.row.original }
                const {
                  explorer,
                  prefix_address,
                } = { ...evm_chains_data.find(c => c?.id === id) }
                const {
                  url,
                  address_path,
                } = { ...explorer }

                return (
                  <div className="flex items-center space-x-1">
                    {value ?
                      <>
                        <a
                          href={`${url}${address_path?.replace('{address}', value)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                        >
                          <span className="xl:hidden">
                            {ellipse(
                              value,
                              12,
                              prefix_address,
                            )}
                          </span>
                          <span className="hidden xl:block">
                            {ellipse(
                              value,
                              16,
                              prefix_address,
                            )}
                          </span>
                        </a>
                        <Copy
                          value={value}
                        />
                      </> :
                      <span>
                        -
                      </span>
                    }
                  </div>
                )
              },
            },
            {
              Header: 'Gas Service Address',
              accessor: 'gas_service',
              disableSortBy: true,
              Cell: props => {
                const {
                  value,
                } = { ...props }
                const {
                  id,
                } = { ...props.row.original }
                const {
                  explorer,
                  prefix_address,
                } = { ...evm_chains_data.find(c => c?.id === id) }
                const {
                  url,
                  address_path,
                } = { ...explorer }

                return (
                  <div className="flex items-center space-x-1">
                    {value ?
                      <>
                        <a
                          href={`${url}${address_path?.replace('{address}', value)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                        >
                          <span className="xl:hidden">
                            {ellipse(
                              value,
                              12,
                              prefix_address,
                            )}
                          </span>
                          <span className="hidden xl:block">
                            {ellipse(
                              value,
                              16,
                              prefix_address,
                            )}
                          </span>
                        </a>
                        <Copy
                          value={value}
                        />
                      </> :
                      <span>
                        -
                      </span>
                    }
                  </div>
                )
              },
            },
          ]}
          data={data}
          noPagination={data.length <= 10}
          defaultPageSize={50}
          className="min-h-full no-border"
        /> :
        <ProgressBar
          borderColor={loader_color(theme)}
          width="36"
          height="36"
        />
      }
    </div>
  )
}