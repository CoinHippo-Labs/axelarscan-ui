import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { utils } from 'ethers'
import { Img } from 'react-image'
import Loader from 'react-loader-spinner'
import StackGrid from 'react-stack-grid'
import { BsFileEarmarkCode } from 'react-icons/bs'
import { TiArrowRight } from 'react-icons/ti'

import Popover from '../popover'
import Copy from '../copy'
import Widget from '../widget'

import { ellipseAddress } from '../../lib/utils'

export default function Assets() {
  const { chains, cosmos_chains, assets } = useSelector(state => ({ chains: state.chains, cosmos_chains: state.cosmos_chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { cosmos_chains_data } = {...cosmos_chains }
  const { assets_data } = { ...assets }

  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)
  const [timer, setTimer] = useState(null)

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')
  const axelarChain = cosmos_chains_data?.find(c => c.id === 'axelarnet')

  useEffect(() => {
    if (!web3) {
      setWeb3(new Web3(Web3.givenProvider))
    }
    else {
      try {
        web3.currentProvider._handleChainChanged = e => {
          try {
            setChainId(Web3.utils.hexToNumber(e?.chainId))
          } catch (error) {}
        }
      } catch (error) {}
    }
  }, [web3])

  useEffect(() => {
    if (addTokenData?.chain_id === chainId && addTokenData?.contract) {
      addTokenToMetaMask(addTokenData.chain_id, addTokenData.contract)
    }
  }, [chainId, addTokenData])

  useEffect(() => {
    const run = async () => setTimer(moment().unix())
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 15 * 1000)
    return () => clearInterval(interval)
  }, [timer])

  const addTokenToMetaMask = async (chain_id, contract) => {
    if (web3 && contract) {
      if (chain_id === chainId) {
        try {
          const response = await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: contract.contract_address,
                symbol: contract.symbol,
                decimals: contract.contract_decimals,
                image: `${contract.image?.startsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : ''}${contract.image}`,
              },
            },
          })
        } catch (error) {}

        setAddTokenData(null)
      }
      else {
        switchNetwork(chain_id, contract)
      }
    }
  }

  const switchNetwork = async (chain_id, contract) => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: utils.hexValue(chain_id) }],
      })
    } catch (error) {
      if (error.code === 4902) {
        try {
          await web3.currentProvider.request({
            method: 'wallet_addEthereumChain',
            params: chains_data?.find(c => c.chain_id === chain_id)?.provider_params,
          })
        } catch (error) {}
      }
    }

    if (contract) {
      setAddTokenData({ chain_id, contract })
    }
  }

  const chainsComponent = chains_data?.map((chain, i) => (
    <Widget
      key={i}
      title={<div className="flex items-center space-x-2">
        <Img
          src={chain.image}
          alt=""
          className="w-6 h-6 rounded-full"
        />
        <span className="text-gray-900 dark:text-white font-semibold">{chain.title}</span>
      </div>}
      className="border-0 shadow-md rounded-2xl"
    >
      <div className="flex items-center text-gray-400 dark:text-gray-500 space-x-1.5 mt-2">
        <Popover
          placement="top"
          title={chain.title}
          content={<div className="w-56">{axelarChain?.short_name} Gateway contract address</div>}
        >
          <BsFileEarmarkCode size={16} className="mb-0.5" />
        </Popover>
        <div className="flex items-center space-x-1">
          {chain.gateway_address ?
            <>
              <Copy
                text={chain.gateway_address}
                copyTitle={<span className="text-xs font-normal">
                  {ellipseAddress(chain.gateway_address, 10)}
                </span>}
              />
              {chain.explorer?.url && (
                <a
                  href={`${chain.explorer.url}${chain.explorer.address_path?.replace('{address}', chain.gateway_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-white"
                >
                  {chain.explorer.icon ?
                    <img
                      src={chain.explorer.icon}
                      alt=""
                      className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                    />
                    :
                    <TiArrowRight size={16} className="transform -rotate-45" />
                  }
                </a>
              )}
            </>
            :
            '-'
          }
        </div>
      </div>
      <div className="mt-4">
        <div className="uppercase text-xs font-semibold">Tokens</div>
        <div className="space-y-2 mt-2">
          {assets_data?.filter(a => (!a?.is_staging || staging) && a?.contracts?.find(c => c.chain_id === chain.chain_id)).map((a, j) => {
            const contract = a.contracts.find(c => c.chain_id === chain.chain_id)
            const addToMetaMaskButton = (
              <button
                onClick={() => addTokenToMetaMask(chain.chain_id, { ...a, ...contract })}
                className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center py-1.5 px-2"
              >
                <Img
                  src="/logos/wallets/metamask.png"
                  alt=""
                  className="w-4 h-4"
                />
              </button>
            )

            return (
              <div key={j} className="flex items-start justify-between">
                <div className="flex items-start space-x-1.5">
                  <Img
                    src={a.image}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex flex-col">
                    <span className="text-gray-600 dark:text-white font-medium">{contract.symbol || a.symbol}</span>
                    <div className="flex items-center space-x-1">
                      {contract.contract_address ?
                        <>
                          <Copy
                            text={contract.contract_address}
                            copyTitle={<span className="text-xs font-normal">
                              {ellipseAddress(contract.contract_address, 8)}
                            </span>}
                          />
                          {chain.explorer?.url && (
                            <a
                              href={`${chain.explorer.url}${chain.explorer.contract_path?.replace('{address}', contract.contract_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {chain.explorer.icon ?
                                <img
                                  src={chain.explorer.icon}
                                  alt=""
                                  className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={16} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </>
                        :
                        '-'
                      }
                    </div>
                  </div>
                </div>
                <Popover
                  placement="left"
                  title={<span className="normal-case text-xs">Add token</span>}
                  content={<div className="w-36 text-xs">Add <span className="font-semibold">{contract.symbol || a.symbol}</span> to MetaMask</div>}
                  titleClassName="py-1"
                >
                  {addToMetaMaskButton}
                </Popover>
              </div>
            )
          })}
        </div>
      </div>
    </Widget>
  ))

  return (
    <div className="max-w-8xl mx-auto py-4">
      <StackGrid
        columnWidth={267}
        gutterWidth={16}
        gutterHeight={16}
        className="hidden sm:block"
      >
        {chainsComponent}
      </StackGrid>
      <div className="block sm:hidden space-y-3">
        {chainsComponent}
      </div>
    </div>
  )
}