import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'

import Dropdown from './dropdown'
import Datatable from '../datatable'
import AddToken from '../add-token'
import Image from '../image'
import Copy from '../copy'
import { ellipse, loader_color } from '../../lib/utils'

export default () => {
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

  const [chainData, setChainData] = useState(null)
  const [assetData, setAssetData] = useState(null)

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  const {
    chain_id,
  } = { ...chainData }

  const data =
    (assets_data || [])
      .filter(a =>
        !a?.is_staging ||
        staging
      )
      .flatMap(a =>
        (a?.contracts || [])
          .filter(c =>
            (
              !chain_id ||
              c?.chain_id === chain_id
            ) &&
            !(
              (evm_chains_data || [])
                .find(_c =>
                  _c?.chain_id === c?.chain_id
                )?.deprecated
            )
          )
          .map(c => {
            return {
              ...a,
              ...c,
            }
          })
      )

  const data_filtered =
    data
      .filter(d =>
        !assetData?.id ||
        d?.id === assetData.id
      )

  return (
    <div className="space-y-4 mx-auto pt-2 pb-6">
      {
        evm_chains_data &&
        assets_data &&
        (
          <div className="flex flex-wrap items-center justify-start space-x-3">
            <Dropdown
              data={
                evm_chains_data
                  .filter(c =>
                    !c?.no_inflation &&
                    !c?.deprecated
                  )
              }
              placeholder="Select Chain"
              allOptionsName="All Chains"
              defaultSelectedKey={chainData?.id || ''}
              onSelect={c => {
                setChainData(c)

                if (
                  c &&
                  assets_data
                    .findIndex(a =>
                      (
                        !assetData ||
                        a?.id === assetData.id
                      ) &&
                      (a?.contracts || [])
                        .findIndex(_c =>
                          _c?.chain_id === c?.chain_id
                        ) > -1
                    ) < 0
                ) {
                  setAssetData('')
                }
              }}
            />
            <Dropdown
              data={
                _.uniqBy(
                  data,
                  'id',
                )
              }
              placeholder="Select Asset"
              allOptionsName="All Assets"
              defaultSelectedKey={
                assetData?.id ||
                ''
              }
              onSelect={a => setAssetData(a)}
            />
          </div>
        )
      }
      {
        evm_chains_data &&
        assets_data ?
          <Datatable
            columns={
              [
                {
                  Header: 'Symbol',
                  accessor: 'symbol',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      image,
                    } = { ...props.row.original }

                    return (
                      <div className="flex items-center space-x-1.5">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              className="w-5 h-5 rounded-full"
                            />
                          )
                        }
                        <span className="font-semibold">
                          {props.value}
                        </span>
                      </div>
                    )
                  },
                },
                {
                  Header: 'Chain',
                  accessor: 'chain_id',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      id,
                      name,
                      image,
                    } = {
                      ...(
                        evm_chains_data
                          .find(c =>
                            c?.chain_id === props.value
                          )
                      ),
                    }

                    return (
                      <div className="flex items-start space-x-1.5">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              className="w-5 h-5 rounded-full"
                            />
                          )
                        }
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {name}
                          </span>
                          <span className="text-slate-400 dark:text-slate-600">
                            {id}
                          </span>
                        </div>
                      </div>
                    )
                  },
                },
                {
                  Header: 'Denom',
                  accessor: 'id',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">
                          {value}
                        </span>
                      </div>
                    )
                  },
                },
                {
                  Header: 'Contract Address',
                  accessor: 'contract_address',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      chain_id,
                    } = { ...props.row.original }
                    const {
                      explorer,
                      prefix_address,
                    } = {
                      ...(
                        evm_chains_data
                          .find(c =>
                            c?.chain_id === chain_id
                          )
                      ),
                    }
                    const {
                      url,
                      contract_path,
                    } = { ...explorer }

                    return (
                      <div className="flex items-center space-x-1">
                        <a
                          href={`${url}${contract_path?.replace('{address}', props.value)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-medium"
                        >
                          <span className="xl:hidden">
                            {ellipse(
                              props.value,
                              12,
                              prefix_address,
                            )}
                          </span>
                          <span className="hidden xl:block">
                            {ellipse(
                              props.value,
                              16,
                              prefix_address,
                            )}
                          </span>
                        </a>
                        <Copy
                          value={props.value}
                        />
                      </div>
                    )
                  },
                },
                {
                  Header: 'Add Token',
                  accessor: 'add_token',
                  disableSortBy: true,
                  Cell: props => (
                    <div className="flex items-center justify-end">
                      <AddToken
                        token_data={
                          {
                            ...props.row.original,
                          }
                        }
                      />
                    </div>
                  ),
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                }
              ]
            }
            data={data_filtered}
            noPagination={data_filtered.length <= 25}
            defaultPageSize={25}
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