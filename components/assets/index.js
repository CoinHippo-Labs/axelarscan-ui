import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Dropdown from './dropdown'
import Datatable from '../datatable'
import AddToken from '../add-token'
import Image from '../image'
import Copy from '../copy'
import { ellipse, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, assets } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { assets_data } = { ...assets }

  const [chainData, setChainData] = useState(null)
  const [assetData, setAssetData] = useState(null)

  // useEffect(() => {
  //   if (assets_data) {
  //     setAssetData(assets_data.find(a => ['uusdc', 'uusdt'].includes(a?.id)))
  //   }
  // }, [assets_data])

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  const data = assets_data?.filter(a => (!a?.is_staging || staging)).flatMap(a => a?.contracts?.filter(c => !chainData?.chain_id || c?.chain_id === chainData.chain_id).map(c => {
    return {
      ...a,
      ...c,
    }
  }) || [])
  const data_filtered = data?.filter(d => !assetData?.id || d?.id === assetData.id)

  return (
    <div className="space-y-4 mx-auto pt-2 pb-6">
      {evm_chains_data && assets_data && (
        <div className="flex flex-wrap items-center justify-start space-x-3">
          <Dropdown
            data={evm_chains_data}
            placeholder="Select Chain"
            allOptionsName="All Chains"
            defaultSelectedKey={chainData?.id || ''}
            onSelect={c => {
              setChainData(c)
              if (c && assets_data.findIndex(a => (!assetData || a?.id === assetData.id) && a?.contracts?.findIndex(_c => _c?.chain_id === c?.chain_id) > -1) < 0) {
                setAssetData('')
              }
            }}
          />
          <Dropdown
            data={_.uniqBy(data, 'id')}
            placeholder="Select Asset"
            allOptionsName="All Assets"
            defaultSelectedKey={assetData?.id || ''}
            onSelect={a => setAssetData(a)}
          />
        </div>
      )}
      {evm_chains_data && assets_data ?
        <Datatable
          columns={[
            {
              Header: 'Asset',
              accessor: 'symbol',
              disableSortBy: true,
              Cell: props => {
                const { image } = { ...props.row.original }
                return (
                  <div className="flex items-center space-x-1.5">
                    {image && (
                      <Image
                        src={image}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
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
                const chain_data = evm_chains_data.find(c => c?.chain_id === props.value)
                const { name, image } = { ...chain_data }
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
              Header: 'Contract Address',
              accessor: 'contract_address',
              disableSortBy: true,
              Cell: props => {
                const { chain_id } = { ...props.row.original }
                const chain_data = evm_chains_data.find(c => c?.chain_id === chain_id)
                const { explorer, prefix_address } = { ...chain_data }
                const { url, contract_path } = { ...explorer }
                return (
                  <div className="flex items-center space-x-1">
                    <a
                      href={`${url}${contract_path?.replace('{address}', props.value)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-white"
                    >
                      <div className="font-bold">
                        <span className="xl:hidden">
                          {ellipse(props.value, 12, prefix_address)}
                        </span>
                        <span className="hidden xl:block">
                          {ellipse(props.value, 16, prefix_address)}
                        </span>
                      </div>
                    </a>
                    <Copy
                      value={props.value}
                      size={18}
                    />
                  </div>
                )
              },
            },
            {
              Header: '',
              accessor: 'id',
              disableSortBy: true,
              Cell: props => (
                <AddToken
                  token_data={{ ...props.row.original }}
                />
              ),
            }
          ]}
          data={data_filtered}
          noPagination={data_filtered.length <= 10}
          defaultPageSize={25}
          className="min-h-full no-border"
        />
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}