import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Tabs, TabsHeader, TabsBody, Tab, TabPanel } from '@material-tailwind/react'
import _ from 'lodash'

import ChainCard from './chain-card'
import AssetCard from './asset-card'
import { split, toArray, includesStringList, equalsIgnoreCase } from '../../lib/utils'

const BYS = ['chains', 'assets']

export default () => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { pathname, query } = { ...router }

  const [rendered, setRendered] = useState(false)
  const [by, setBy] = useState(query.by)
  const [inputSearch, setInputSearch] = useState('')
  const [assetFocusId, setAssetFocusId] = useState(null)

  useEffect(
    () => {
      switch (pathname) {
        case '/resources':
          router.push(`/resources/${_.head(BYS)}`)
          break
        case '/assets':
          router.push('/resources/assets')
          break
        default:
          if (!rendered) {
            setRendered(true)
          }
          else if (by) {
            router.push(`/resources/${by}`)
            setInputSearch('')
            if (by !== 'assets') {
              setAssetFocusId(null)
            }
          }
          break
      }
    },
    [pathname, rendered, by],
  )

  useEffect(() => setBy(BYS.includes(query.by) ? query.by : query.by ? _.head(BYS) : query.by), [query.by])

  const filter = by => {
    switch (by) {
      case 'chains':
        return toArray(chains_data).filter(c => !c.no_inflation || c.deprecated).filter(c => !inputSearch || includesStringList(_.uniq(toArray(['id', 'chain_name', 'name'].map(f => c[f]), 'lower')), split(inputSearch, 'lower', ' ')))
      case 'assets':
        return toArray(assets_data).filter(c => !inputSearch || includesStringList(_.uniq(toArray(_.concat(['denom', 'name', 'symbol'].map(f => c[f]), c.denoms, Object.values({ ...c.addresses }).flatMap(a => toArray([!equalsIgnoreCase(inputSearch, 'axl') && a.symbol, a.address, a.ibc_denom]))), 'lower')), split(inputSearch, 'lower', ' ')))
      default:
        return null
    }
  }

  const render = by => {
    switch (by) {
      case 'chains':
        return (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-7 gap-4 xl:gap-6">
            {filter(by).map((d, i) => <ChainCard key={i} data={d} />)}
          </div>
        )
      case 'assets':
        return (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-7 gap-4 xl:gap-6">
            {filter(by).map((d, i) => <AssetCard key={i} data={d} focusId={assetFocusId} focus={id => setAssetFocusId(id)} />)}
          </div>
        )
      default:
        return <div />
    }
  }

  return (
    rendered && by && (
      <Tabs value={by} className="children tabs pt-8 px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-2">
          <TabsHeader className="max-w-xs">
            {BYS.map(b => (
              <Tab
                key={b}
                value={b}
                onClick={() => setBy(b)}
                className="capitalize"
              >
                {b}
              </Tab>
            ))}
          </TabsHeader>
          <div className="max-w-sm">
            <input
              placeholder="Search"
              value={inputSearch}
              onChange={e => setInputSearch(split(e.target.value, 'normal', ' ', false).join(' '))}
              className="w-80 sm:w-64 bg-slate-50 dark:bg-slate-900 rounded text-base py-2 px-2.5"
            />
          </div>
        </div>
        <TabsBody>
          {BYS.filter(b => b === by).map(b => (
            <TabPanel key={b} value={b}>
              {render(b)}
            </TabPanel>
          ))}
        </TabsBody>
      </Tabs>
    )
  )
}