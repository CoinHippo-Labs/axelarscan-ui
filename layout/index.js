import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import PageVisibility from 'react-page-visibility'
import _ from 'lodash'

import Navbar from '../components/navbar'
import Footer from '../components/footer'
import meta from '../lib/meta'
import { getChains, getAssets } from '../lib/api/config'
import { getTokensPrice } from '../lib/api/tokens'
import { getContracts } from '../lib/api/gmp'
import { getENS } from '../lib/api/ens'
import { getLENS } from '../lib/api/lens'
import { getSPACEID } from '../lib/api/spaceid'
import { getUNSTOPPABLE } from '../lib/api/unstoppable'
import { getChainMaintainers, getEscrowAddresses } from '../lib/api/axelar'
import { stakingParams, bankSupply, stakingPool, slashingParams } from '../lib/api/lcd'
import { getStatus } from '../lib/api/rpc'
import { getTVL } from '../lib/api/tvl'
import { searchHeartbeats, getValidators, getValidatorsVotes } from '../lib/api/validators'
import { getKeyType } from '../lib/key'
import { NUM_BLOCKS_PER_HEARTBEAT, startBlock, endBlock } from '../lib/heartbeat'
import { formatUnits } from '../lib/number'
import { toArray, equalsIgnoreCase } from '../lib/utils'
import { THEME, PAGE_VISIBLE, CHAINS_DATA, ASSETS_DATA, CONTRACTS_DATA, ENS_DATA, LENS_DATA, SPACEID_DATA, UNSTOPPABLE_DATA, ACCOUNTS_DATA, CHAIN_DATA, STATUS_DATA, MAINTAINERS_DATA, TVL_DATA, VALIDATORS_DATA, PROFILES_DATA } from '../reducers/types'

export default ({ children }) => {
  const dispatch = useDispatch()
  const { preferences, chains, assets, ens, lens, spaceid, unstoppable, status, validators, profiles } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, ens: state.ens, lens: state.lens, spaceid: state.spaceid, unstoppable: state.unstoppable, status: state.status, validators: state.validators, profiles: state.profiles }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { lens_data } = { ...lens }
  const { spaceid_data } = { ...spaceid }
  const { unstoppable_data } = { ...unstoppable }
  const { status_data } = { ...status }
  const { validators_data } = { ...validators }
  const { profiles_data } = { ...profiles }

  const router = useRouter()
  const { pathname, asPath, query } = { ...router }
  const { address } = { ...query }

  useEffect(
    () => {
      if (typeof window !== 'undefined') {
        const _theme = localStorage.getItem(THEME)
        if (_theme && _theme !== theme) {
          dispatch({ type: THEME, value: _theme })
        }
      }
    },
    [theme],
  )

  useEffect(
    () => {
      if (typeof window !== 'undefined' && !profiles_data) {
        try {
          const _profiles_data = localStorage.getItem(PROFILES_DATA)
          if (_profiles_data) {
            dispatch({ type: PROFILES_DATA, value: JSON.parse(_profiles_data) })
          }
        } catch (error) {}
      }
    },
    [profiles_data],
  )

  // chains
  useEffect(
    () => {
      const getData = async () => dispatch({ type: CHAINS_DATA, value: toArray(await getChains()).map((c, i) => { return { ...c, i } }) })
      getData()
    },
    [],
  )

  // assets
  useEffect(
    () => {
      const getData = async () => {
        const assets = toArray(await getAssets())
        const prices = await getTokensPrice({ symbols: assets.map(a => a.symbol) })
        if (toArray(prices).length > 0) {
          for (let i = 0; i < prices.length; i++) {
            assets[i].price = prices[i]
          }
        }
        dispatch({ type: ASSETS_DATA, value: assets })
      }
      getData()
    },
    [],
  )

  // contracts
  useEffect(
    () => {
      const getData = async () => dispatch({ type: CONTRACTS_DATA, value: await getContracts() })
      getData()
    },
    [],
  )

  // ns
  useEffect(
    () => {
      const getData = async () => {
        if (address && chains_data && getKeyType(address, chains_data) === 'evmAddress') {
          if (!ens_data?.[address]) {
            const data = await getENS(address)
            if (data) {
              dispatch({ type: ENS_DATA, value: data })
            }
          }
          if (!lens_data?.[address]) {
            const data = await getLENS(address)
            if (data) {
              dispatch({ type: LENS_DATA, value: data })
            }
          }
          if (!spaceid_data?.[address]) {
            const data = await getSPACEID(address, undefined, chains_data)
            if (data) {
              dispatch({ type: SPACEID_DATA, value: data })
            }
          }
          if (!unstoppable_data?.[address]) {
            const data = await getUNSTOPPABLE(address)
            if (data) {
              dispatch({ type: UNSTOPPABLE_DATA, value: data })
            }
          }
        }
      }
      getData()
    },
    [address, chains_data],
  )

  // escrow addresses
  useEffect(
    () => {
      const getData = async () => {
        const { data } = { ...await getEscrowAddresses() }
        if (data) {
          dispatch({ type: ACCOUNTS_DATA, value: data })
        }
      }
      // getData()
    },
    [],
  )

  // chain
  useEffect(
    () => {
      const include_paths = ['/validators', '/validators/[status]']

      const getData = async is_interval => {
        let response = await stakingParams()
        if (response) {
          const { params } = { ...response }
          const { bond_denom } = { ...params }
          dispatch({ type: CHAIN_DATA, value: { staking_params: { ...params } } })

          if (bond_denom) {
            response = await bankSupply(bond_denom)
            const { amount } = { ...response?.amount }
            if (amount) {
              dispatch({ type: CHAIN_DATA, value: { bank_supply: { symbol: 'AXL', amount: formatUnits(amount, 6) } } })
            }
          }
        }

        response = await stakingPool()
        if (response) {
          const { pool } = { ...response }
          dispatch({ type: CHAIN_DATA, value: { staking_pool: Object.fromEntries(Object.entries({ ...pool }).map(([k, v]) => [k, formatUnits(v, 6)])) } })
        }

        if (!is_interval) {
          response = await slashingParams()
          if (response) {
            const { params } = { ...response }
            dispatch({ type: CHAIN_DATA, value: { slashing_params: { ...params } } })
          }
        }
      }

      getData()
      // const interval = setInterval(() => getData(true), (include_paths.findIndex(p => pathname === p) > -1 ? 5 * 60 : 30) * 1000)
      // return () => clearInterval(interval)
    },
    [chains_data, assets_data],
  )

  // status
  useEffect(
    () => {
      const include_paths = ['/'/*, '/validators', '/validators/[status]'*/, '/validator/[address]']

      const getData = async () => {
        if (pathname) {
          const response = await getStatus()
          if (response) {
            dispatch({ type: STATUS_DATA, value: response })
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(), (include_paths.findIndex(p => pathname === p) > -1 ? 6 : 5 * 60) * 1000)
      return () => clearInterval(interval)
    },
    [pathname],
  )

  // maintainers
  useEffect(
    () => {
      const getChainData = async chain => {
        const { maintainers } = { ...await getChainMaintainers({ chain }) }
        if (maintainers) {
          dispatch({ type: MAINTAINERS_DATA, value: { [chain]: maintainers } })
        }
      }

      const getData = () => {
        if (pathname?.startsWith('/validator') && chains_data) {
          toArray(chains_data).filter(c => c.chain_type === 'evm').map(c => c.id).forEach(c => getChainData(c))
        }
      }

      getData()
      // const interval = setInterval(() => getData(), 5 * 60 * 1000)
      // return () => clearInterval(interval)
    },
    [pathname, chains_data],
  )

  // tvl
  useEffect(
    () => {
      const getAssetData = async asset => {
        const { data, updated_at } = { ...await getTVL({ asset }) }
        if (data) {
          dispatch({ type: TVL_DATA, value: { [asset]: { ..._.head(data), updated_at } } })
        }
      }

      const getData = () => {
        if (pathname?.startsWith('/tvl') && assets_data) {
          toArray(assets_data).filter(a => !a.no_tvl).map(a => a.denom).forEach(a => getAssetData(a))
        }
      }

      getData()
      const interval = setInterval(() => getData(), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, assets_data],
  )

  // validators
  useEffect(
    () => {
      const exclude_paths = ['/address', '/interchain', '/transfer', '/gmp', '/evm-batch', '/batch', '/proposals', '/resources', '/assets']
      const lite_paths = ['/proposal']

      const getVoteCount = (vote, votes) => _.sum(Object.values({ ...votes }).map(v => _.last(Object.entries({ ...v?.votes }).find(([_k, _v]) => equalsIgnoreCase(_k, vote?.toString()))) || 0))
      const getData = async is_interval => {
        const { latest_block_height } = { ...status_data }
        if (is_interval || (pathname && exclude_paths.findIndex(p => pathname.startsWith(p)) < 0 && latest_block_height)) {
          const includes = lite_paths.findIndex(p => pathname.startsWith(p)) > -1 ? [] : undefined
          let { data } = { ...await getValidators({ includes }) }

          if (data) {
            if (!validators_data) {
              dispatch({ type: VALIDATORS_DATA, value: data })
            }

            const fromBlock = startBlock(latest_block_height - 10000)
            const toBlock = endBlock(latest_block_height)
            const totalHeartbeat = Math.floor((toBlock - fromBlock) / NUM_BLOCKS_PER_HEARTBEAT) + 1
            const response = await searchHeartbeats({
              fromBlock,
              toBlock,
              aggs: {
                heartbeats: {
                  terms: { field: 'sender.keyword', size: 1000 },
                  aggs: { period_height: { terms: { field: 'period_height', size: 1000 } } },
                },
              },
              size: 0,
            })

            if (Array.isArray(response)) {
              data = data.map(d => {
                const { broadcaster_address } = { ...d }
                d.heartbeats_uptime = totalHeartbeat > 0 ? (response.find(_d => equalsIgnoreCase(_d.key, broadcaster_address))?.count || 0) * 100 / totalHeartbeat : 0
                d.heartbeats_uptime = d.heartbeats_uptime > 100 ? 100 : d.heartbeats_uptime
                return d
              })
              if (!validators_data || !pathname?.startsWith('/validator')) {
                dispatch({ type: VALIDATORS_DATA, value: data })
              }
            }

            if (pathname?.startsWith('/validator')) {
              const response = await getValidatorsVotes()
              if (response) {
                data = data.map(d => {
                  const { broadcaster_address } = { ...d }
                  d.votes = { ...response.data?.[broadcaster_address] }
                  d.total_votes = d.votes.total || 0
                  d.total_yes_votes = getVoteCount(true, d.votes.chains)
                  d.total_no_votes = getVoteCount(false, d.votes.chains)
                  d.total_unsubmitted_votes = getVoteCount('unsubmitted', d.votes.chains)
                  d.total_polls = response.total || 0
                  return d
                })
                dispatch({ type: VALIDATORS_DATA, value: data })
              }
            }
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [pathname, status_data],
  )

  const { title, description, image, url } = { ...meta(asPath) }

  return (
    <>
      <Head>
        <title>
          {title}
        </title>
        <meta
          name="og:site_name"
          property="og:site_name"
          content={title}
        />
        <meta
          name="og:title"
          property="og:title"
          content={title}
        />
        <meta
          itemProp="name"
          content={title}
        />
        <meta
          itemProp="headline"
          content={title}
        />
        <meta
          itemProp="publisher"
          content={title}
        />
        <meta
          name="twitter:title"
          content={title}
        />

        <meta
          name="description"
          content={description}
        />
        <meta
          name="og:description"
          property="og:description"
          content={description}
        />
        <meta
          itemProp="description"
          content={description}
        />
        <meta
          name="twitter:description"
          content={description}
        />

        <meta
          name="og:image"
          property="og:image"
          content={image}
        />
        <meta
          itemProp="thumbnailUrl"
          content={image}
        />
        <meta
          itemProp="image"
          content={image}
        />
        <meta
          name="twitter:image"
          content={image}
        />
        <link
          rel="image_src"
          href={image}
        />

        <meta
          name="og:url"
          property="og:url"
          content={url}
        />
        <meta
          itemProp="url"
          content={url}
        />
        <meta
          name="twitter:url"
          content={url}
        />
        <link
          rel="canonical"
          href={url}
        />
      </Head>
      <PageVisibility onChange={v => dispatch({ type: PAGE_VISIBLE, value: v })}>
        <div
          data-layout="layout"
          data-background={theme}
          data-navbar={theme}
          className={`min-h-screen antialiased disable-scrollbars text-sm ${theme}`}
        >
          <div className="wrapper">
            <div className="main w-full bg-white dark:bg-black">
              <Navbar />
              <div className="w-full">
                {children}
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </PageVisibility>
    </>
  )
}