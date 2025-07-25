'use client'

import { useEffect, useState } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { usePublicClient, useChainId, useSwitchChain, useWalletClient, useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { hashMessage, parseAbiItem, verifyMessage } from 'viem'
import { ConnectButton as SuiConnectButton, useCurrentAccount as useSuiCurrentAccount } from '@mysten/dapp-kit'
import freighter from '@stellar/freighter-api'
import { useWallets as useXRPLWallets, useAccount as useXRPLAccount, useConnect as useXRPLConnect, useDisconnect as useXRPLDisconnect } from '@xrpl-wallet-standard/react'
import { providers } from 'ethers'
// import { BrowserProvider, FallbackProvider, JsonRpcProvider, JsonRpcSigner } from 'ethers'
import { create } from 'zustand'
import clsx from 'clsx'

import { Image } from '@/components/Image'
import { ENVIRONMENT } from '@/lib/config'
import { toArray } from '@/lib/parser'

import '@mysten/dapp-kit/dist/index.css'

const publicClientToProvider = publicClient => {
  const { chain, transport } = { ...publicClient }

  const network = {
    chainId: chain?.id,
    name: chain?.name,
    ensAddress: chain?.contracts?.ensRegistry?.address,
  }

  // if (transport.type === 'fallback') {
  //   const providers = transport.transports.map(({ value }) => new JsonRpcProvider(value?.url, network))

  //   if (providers.length === 1) {
  //     return providers[0]
  //   }

  //   return new FallbackProvider(providers)
  // }

  // return new JsonRpcProvider(transport.url, network)

  if (transport.type === 'fallback') {
    return new providers.FallbackProvider(transport.transports.map(({ value }) => new providers.JsonRpcProvider(value?.url, network)))
  }

  return new providers.JsonRpcProvider(transport.url, network)
}

const walletClientToProvider = walletClient => {
  const { chain, transport } = { ...walletClient }

  const network = {
    chainId: chain?.id,
    name: chain?.name,
    ensAddress: chain?.contracts?.ensRegistry?.address,
  }

  // const provider = new BrowserProvider(transport, network)

  return new providers.Web3Provider(transport, network)
}

const walletClientToSigner = walletClient => {
  const { account, chain, transport } = { ...walletClient }

  const network = {
    chainId: chain?.id,
    name: chain?.name,
    ensAddress: chain?.contracts?.ensRegistry?.address,
  }

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

  const { open } = useAppKit()
  const publicClient = usePublicClient()
  const chainIdConnected = useChainId()
  const { switchChain } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()
  const { disconnect } = useDisconnect()

  const message = process.env.NEXT_PUBLIC_APP_URL
  const { data: signature } = useSignMessage({ message })

  useEffect(() => {
    if (chainIdConnected && walletClient && address) {
      setChainId(chainIdConnected)
      setAddress(address)
      // setProvider(publicClientToProvider(publicClient))
      setProvider(walletClientToProvider(walletClient))
      setSigner(walletClientToSigner(walletClient))
    }
    else {
      setChainId(null)
      setAddress(null)
      setProvider(null)
      setSigner(null)
    }
  }, [chainIdConnected, publicClient, walletClient, address, setChainId, setAddress, setProvider, setSigner])

  // validatate signature
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
        else {
          setSignatureValid(await verifyMessage({ address, message, signature }))
        }
      } catch (error) {}
    }

    if (!signatureValid && publicClient) {
      validateSignature()
    }
  }, [signatureValid, publicClient, address, message, signature])

  return provider ?
    connectChainId && connectChainId !== chainId ?
      <button onClick={() => switchChain({ chainId: connectChainId })} className={clsx(className)}>
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
  const { chainId, address, provider, signer, setChainId, setAddress, setProvider, setSigner } = useCosmosWalletStore()

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
  }, [chainId, setChainId, address, setAddress, setProvider, setSigner])

  const enable = async (chainId = connectChainId) => {
    try {
      if (chainId) {
        await window.keplr.enable(chainId)
      }
    } catch (error) {
      if (!error?.toString()?.includes('Request rejected')) {
        try {
          const response = await fetch(`https://${ENVIRONMENT === 'mainnet' ? '' : 'testnet.'}api.0xsquid.com/v1/chains`).catch(error => null)
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
    } catch (error) {}

    return
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
    else {
      disconnect()
    }
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

export const useSuiWalletStore = create()(set => ({
  address: null,
  setAddress: data => set(state => ({ ...state, address: data })),
}))

export function SuiWallet({ children, className }) {
  const { address, setAddress } = useSuiWalletStore()
  const account = useSuiCurrentAccount()

  useEffect(() => {
    const address = account?.address

    if (address) {
      setAddress(address)
    }
    else {
      setAddress(null)
    }
  }, [account, setAddress])

  const connect = () => {
    const address = account?.address

    if (address) {
      setAddress(address)
    }
  }

  const disconnect = () => {
    setAddress(null)
  }

  return address ?
    <button onClick={() => disconnect()} className={clsx(className)}>
      {children || <SuiConnectButton /> || (
        <div className="h-6 bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
          Disconnect
        </div>
      )}
    </button> :
    <button onClick={() => connect()} className={clsx(className)}>
      {children || <SuiConnectButton /> || (
        <div className="h-6 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
          Connect
        </div>
      )}
    </button>
}

export const useStellarWalletStore = create()(set => ({
  address: null,
  provider: null,
  network: null,
  setAddress: data => set(state => ({ ...state, address: data })),
  setProvider: data => set(state => ({ ...state, provider: data })),
  setNetwork: data => set(state => ({ ...state, network: data })),
}))

export function StellarWallet({ children, className }) {
  const { address, provider, setAddress, setProvider, setNetwork } = useStellarWalletStore()

  useEffect(() => {
    const getData = async () => {
      if (address) {
        setAddress(address)
        setProvider(freighter)
      }
      else {
        setAddress(null)
        setProvider(null)
      }

      setNetwork(await getNetwork())
    }

    getData()
  }, [address, setAddress, setProvider, setNetwork])

  const getAddress = async () => {
    const { address } = { ...await freighter.getAddress() }
    return address
  }

  const getNetwork = async () => await freighter.getNetworkDetails()

  const connect = async () => {
    await freighter.setAllowed()
    const address = await getAddress()

    if (address) {
      setAddress(address)
      setProvider(freighter)
      setNetwork(await getNetwork())
    }
  }

  const disconnect = () => {
    setAddress(null)
    setProvider(null)
    setNetwork(null)
  }

  return address ?
    <button onClick={() => disconnect()} className={clsx(className)}>
      {children || (
        <div className="h-6 bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
          Disconnect
        </div>
      )}
    </button> :
    <button onClick={() => connect()} className={clsx(className)}>
      {children || (
        <div className="h-6 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
          Connect
        </div>
      )}
    </button>
}

export const useXRPLWalletStore = create()(set => ({
  address: null,
  setAddress: data => set(state => ({ ...state, address: data })),
}))

export function XRPLWallet({ children, className }) {
  const { address, setAddress } = useXRPLWalletStore()

  const wallets = useXRPLWallets()
  const account = useXRPLAccount()
  const { connect: connectXRPL } = useXRPLConnect()
  const disconnectXRPL = useXRPLDisconnect()

  useEffect(() => {
    const address = account?.address

    if (address) {
      setAddress(address)
    }
    else {
      setAddress(null)
    }
  }, [account, setAddress])

  return address ?
    <button onClick={() => disconnectXRPL()} className={clsx(className)}>
      {children || (
        <div className="h-6 bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600 rounded-xl flex items-center font-display text-white whitespace-nowrap px-2.5 py-1">
          Disconnect
        </div>
      )}
    </button> :
    <div className="flex flex-col gap-y-2">
      {wallets.filter(w => w.name === 'Crossmark' ? window?.crossmark : w).map((w, i) => (
        <button key={i} onClick={() => connectXRPL(w)} className={clsx(className)}>
          <div className="w-fit h-6 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl flex items-center font-display text-white whitespace-nowrap gap-x-1.5 px-2.5 py-1">
            <Image
              src={w.icon}
              alt=""
              width={16}
              height={16}
            />
            {w.name}
          </div>
        </button>
      ))}
    </div>
}
