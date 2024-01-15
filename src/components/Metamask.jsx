import { useEffect, useState } from 'react'
import { Web3 } from 'web3'
import { create } from 'zustand'
import clsx from 'clsx'

import Image from '@/components/Image'
import { Tooltip } from '@/components/Tooltip'
import { useGlobalStore } from '@/app/providers'
import { getChainData, getAssetData } from '@/lib/config'
import { split, toArray } from '@/lib/parser'
import MetamaskLogo from '@/images/wallets/metamask.png'

export const useChainIdStore = create()(set => ({
  chainId: null,
  setChainId: data => set(state => ({ ...state, chainId: data })),
}))

export function AddMetamask({ chain, asset, width = 20, height = 20, noTooltip = false }) {
  const [web3, setWeb3] = useState(null)
  const [data, setData] = useState(null)
  const { chainId, setChainId } = useChainIdStore()
  const { chains, assets } = useGlobalStore()

  useEffect(() => {
    if (!web3 && window.ethereum) setWeb3(new Web3(window.ethereum))
    else if (web3?.currentProvider) {
      web3.currentProvider._handleChainChanged = e => {
        try {
          const chainId = Web3.utils.hexToNumber(e.chainId)
          setChainId(chainId)
        } catch (error) {}
      }
    }
  }, [web3])

  useEffect(() => {
    if (data?.tokenData && data.chain_id === chainId) addToken(data.chain_id, data.tokenData)
  }, [data, chainId])

  const addToken = async (chain_id, tokenData) => {
    if (web3 && tokenData) {
      if (chain_id === chainId) {
        try {
          const { address, symbol, decimals, image } = { ...tokenData }
          await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: { address, symbol, decimals, image: image ? `${image.startsWith('/') ? window.location.origin : ''}${image}` : undefined },
            },
          })
        } catch (error) {}
        setData(null)
      }
      else switchNetwork(chain_id, tokenData)
    }
  }

  const switchNetwork = async (chain_id, tokenData) => {
    try {
      await web3.currentProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: web3.utils.toHex(chain_id) }] })
    } catch (error) {
      if (error?.code === 4902) {
        try {
          const { provider_params } = { ...toArray(chains).find(d => d.chain_id === chain_id) }
          await web3.currentProvider.request({ method: 'wallet_addEthereumChain', params: provider_params })
        } catch (error) {}
      }
    }
    if (tokenData) setData({ chain_id, tokenData })
  }

  const { id, chain_id, name } = { ...getChainData(chain, chains, false) }
  const { symbol, decimals, image, addresses } = { ...getAssetData(asset, assets) }
  const tokenData = { symbol, decimals, image, ...addresses?.[id] }
  const alreadyOnChain = chain_id === chainId

  const button = (
    <button
      onClick={() => {
        if (chain) {
          if (asset) addToken(chain_id, tokenData)
          else switchNetwork(chain_id)
        }
      }}
      className={clsx((alreadyOnChain && !asset) || !chain ? 'cursor-not-allowed' : 'cursor-pointer')}
    >
      <Image
        src={MetamaskLogo}
        width={width}
        height={height}
      />
    </button>
  )

  const tooltip = alreadyOnChain && !asset ? 'Your Metamask is currently on this chain.' : split(`Add ${asset ? tokenData.symbol || asset : ''} ${chain && asset ? 'on' : ''} ${name || chain} to Metamask`, { delimiter: ' ' }).join(' ')
  return chainId && (!noTooltip ?
    <Tooltip content={tooltip} className="whitespace-nowrap">
      {button}
    </Tooltip> :
    button
  )
}
