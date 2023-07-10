import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Tabs, TabsHeader, TabsBody, Tab, TabPanel } from '@material-tailwind/react'
import _ from 'lodash'

import GMP from '../interchain-transfers/gmps'
import Transfers from '../interchain-transfers/transfers'
import { getTitle } from '../../lib/utils'

const MENUS = ['gmp_transfers', 'token_transfers']

export default () => {
  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address, tab } = { ...query }

  const [menu, setMenu] = useState(tab)

  useEffect(
    () => {
      if (tab) {
        setMenu(tab)
      }
      else if (address) {
        setMenu(_.head(MENUS))
      }
    },
    [address, tab],
  )

  useEffect(
    () => {
      if (menu) {
        if (pathname && address) {
          const qs = new URLSearchParams()
          qs.append('tab', menu)
          const qs_string = qs.toString()
          router.push(`${pathname.replace('[address]', address)}${qs_string ? `?${qs_string}` : ''}`)
        }
      }
    },
    [menu],
  )

  const render = menu => {
    switch (menu) {
      case 'gmp_transfers':
        return <GMP />
      case 'token_transfers':
        return <Transfers />
      default:
        return <div />
    }
  }

  return menu && (
    <Tabs value={menu} className="children tabs pt-8 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-2">
        <TabsHeader className="max-w-sm">
          {MENUS.map(m => (
            <Tab
              key={m}
              value={m}
              onClick={() => setMenu(m)}
              className="whitespace-nowrap normal-case text-xs sm:text-base"
            >
              {getTitle(m)}
            </Tab>
          ))}
        </TabsHeader>
      </div>
      <TabsBody>
        {MENUS.filter(m => m === menu).map(m => (
          <TabPanel key={m} value={m}>
            {render(m)}
          </TabPanel>
        ))}
      </TabsBody>
    </Tabs>
  )
}