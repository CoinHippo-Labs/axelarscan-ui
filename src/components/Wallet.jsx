import { useEffect, useState } from 'react'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { usePublicClient, useNetwork, useSwitchNetwork, useWalletClient, useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { hashMessage, parseAbiItem, verifyMessage } from 'viem'
import { providers } from 'ethers'
// import { BrowserProvider, FallbackProvider, JsonRpcProvider, JsonRpcSigner } from 'ethers'
import { create } from 'zustand'
import clsx from 'clsx'

import { ENVIRONMENT } from '@/lib/config'

const publicClientToProvider = publicClient => {
  const { chain, transport } = { ...publicClient }
  const network = { chainId: chain.id, name: chain.name, ensAddress: chain.contracts?.ensRegistry?.address }
  // if (transport.type === 'fallback') {
  //   const providers = transport.transports.map(({ value }) => new JsonRpcProvider(value?.url, network))
  //   if (providers.length === 1) return providers[0]
  //   return new FallbackProvider(providers)
  // }
  // return new JsonRpcProvider(transport.url, network)
  if (transport.type === 'fallback') {
    return new providers.FallbackProvider(transport.transports.map(({ value }) => new providers.JsonRpcProvider(value?.url, network)))
  }
  return new providers.JsonRpcProvider(transport.url, network)
}

const walletClientToSigner = walletClient => {
  const { account, chain, transport } = { ...walletClient }
  const network = { chainId: chain.id, name: chain.name, ensAddress: chain.contracts?.ensRegistry?.address }
  // const provider = new BrowserProvider(transport, network)
  // const signer = new JsonRpcSigner(provider, account.address)
  const provider = new providers.Web3Provider(transport, network)
  const signer = provider.getSigner(account.address)
  return signer
}

export const useEVMWalletStore = create()(set => ({
  chainId: null,
  address: null,
  provider: null,
  signer: null,
  setChainId: data => set(state => ({ ...state, chainId: data })),
  setAddress: data => set(state => ({ ...state, address: data })),
  setProvider: data => set(state => ({ ...state, provider: data })),
  setSigner: data => set(state => ({ ...state, signer: data })),
}))

export function EVMWallet({ connectChainId, children, className }) {
  const { chainId, provider, setChainId, setAddress, setProvider, setSigner } = useEVMWalletStore()
  const [signatureValid, setSignatureValid] = useState(null)

  const { open } = useWeb3Modal()
  const publicClient = usePublicClient()
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetwork()
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()
  const { disconnect } = useDisconnect()

  const message = process.env.NEXT_PUBLIC_APP_URL
  const { data: signature } = useSignMessage({ message })

  useEffect(() => {
    if (chain?.id && walletClient && address) {
      setChainId(chain.id)
      setAddress(address)
      setProvider(publicClientToProvider(publicClient))
      setSigner(walletClientToSigner(walletClient))
    }
    else {
      setChainId(null)
      setAddress(null)
      setProvider(null)
      setSigner(null)
    }
  }, [chain, publicClient, walletClient, address, setChainId, setAddress, setProvider, setSigner])

  useEffect(() => {
    const validateSignature = async () => {
      try {
        if (await publicClient.getBytecode({ address })) {
          const response = await publicClient.readContract({
            address,
            abi: [parseAbiItem('function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)')],
            functionName: 'isValidSignature',
            args: [hashMessage(message), signature],
          })
          // https://eips.ethereum.org/EIPS/eip-1271
          setSignatureValid(response === '0x1626ba7e')
        }
        else setSignatureValid(await verifyMessage({ address, message, signature }))
      } catch (error) {}
    }

    if (!signatureValid && publicClient) validateSignature()
  }, [signatureValid, publicClient, address, message, signature])

  return provider ?
    connectChainId && connectChainId !== chainId ?
      <button onClick={() => switchNetwork(connectChainId)} className={clsx(className)}>
        {children || (
          <div className="h-6 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl flex items-center font-display text-zinc-900 dark:text-zinc-100 whitespace-nowrap px-2.5 py-1">
            Switch Network
          </div>
        )}
      </button> :
      <button onClick={() => disconnect()} className={clsx(className)}>
        {children || (
          <div className="h-6 bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
            Disconnect
          </div>
        )}
      </button> :
    <button onClick={() => open()} className={clsx(className)}>
      {children || (
        <div className="h-6 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
          Connect
        </div>
      )}
    </button>
}

export const useCosmosWalletStore = create()(set => ({
  chainId: null,
  address: null,
  provider: null,
  signer: null,
  setChainId: data => set(state => ({ ...state, chainId: data })),
  setAddress: data => set(state => ({ ...state, address: data })),
  setProvider: data => set(state => ({ ...state, provider: data })),
  setSigner: data => set(state => ({ ...state, signer: data })),
}))

export function CosmosWallet({ connectChainId, children, className }) {
  const { chainId, provider, setChainId, setAddress, setProvider, setSigner } = useCosmosWalletStore()

  useEffect(() => {
    if (chainId && signer && address) {
      setChainId(chainId)
      setAddress(address)
      setProvider(window?.keplr)
      setSigner(signer)
    }
    else {
      setChainId(null)
      setAddress(null)
      setProvider(null)
      setSigner(null)
    }
  }, [setChainId, setAddress, setProvider, setSigner])

  const enable = async (chainId = connectChainId) => {
    try {
      if (chainId) await window.keplr.enable(chainId)
    } catch (error) {
      if (!error?.toString()?.includes('Request rejected')) {
        try {
          const response = await fetch(`https://${ENVIRONMENT !== 'mainnet' ? 'testnet.' : ''}api.0xsquid.com/v1/chains`).catch(error => { return null })
          const { chains } = { ...await response.json() }

          await window.keplr.experimentalSuggestChain(toArray(chains).find(d => d.chainId === chainId))
          await window.keplr.enable(chainId)
        } catch (error) {}
      }
    }
  }

  const getSigner = async (chainId = connectChainId) => {
    if (!chainId) return
    await enable(chainId)
    try {
      return await window.keplr.getOfflineSignerAuto(chainId)
    } catch (error) {
      return null
    }
  }

  const getAddress = async (chainId = connectChainId) => {
    if (!chainId) return
    const signer = await getSigner(chainId)
    if (!signer) return
    const [account] = await signer.getAccounts()
    return account.address
  }

  const connect = async (chainId = connectChainId) => {
    const signer = await getSigner(chainId)
    const address = signer && await getAddress(chainId)

    if (chainId && signer && address) {
      setChainId(chainId)
      setAddress(address)
      setProvider(window?.keplr)
      setSigner(signer)
    }
    else disconnect()
  }

  const disconnect = () => {
    setChainId(null)
    setAddress(null)
    setProvider(null)
    setSigner(null)
  }

  return provider ?
    connectChainId && connectChainId !== chainId ?
      <button onClick={() => connect(connectChainId)} className={clsx(className)}>
        {children || (
          <div className="h-6 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl flex items-center font-display text-zinc-900 dark:text-zinc-100 whitespace-nowrap px-2.5 py-1">
            Connect
          </div>
        )}
      </button> :
      <button onClick={() => disconnect()} className={clsx(className)}>
        {children || (
          <div className="h-6 bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
            Disconnect
          </div>
        )}
      </button> :
    <button onClick={() => connect(connectChainId)} className={clsx(className)}>
      {children || (
        <div className="h-6 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
          Connect
        </div>
      )}
    </button>
}
