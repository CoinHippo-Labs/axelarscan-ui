import { useSelector, shallowEqual } from 'react-redux'
import { Card, CardBody, Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import Spinner from '../../../spinner'
import NumberDisplay from '../../../number'
import Image from '../../../image'
import AccountProfile from '../../../profile/account'
import { getChainData } from '../../../../lib/config'
import { split, toArray } from '../../../../lib/utils'

export default (
  {
    data,
    type = 'chain',
    tab,
    field = 'num_txs',
    title = '',
    description = '',
    numberFormat = '0,0',
    prefix = '',
  },
) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <Card className="card">
      <CardBody className="space-y-1.5 p-3">
        <div className="flex flex-col">
          <span className="text-black dark:text-white text-sm font-semibold">
            {title}
          </span>
          {description && (
            <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">
              {description}
            </span>
          )}
        </div>
        <div className="w-full">
          {data ?
            <div className="space-y-1">
              {toArray(data).map((d, i) => (
                <div key={i} className="flex items-center justify-between space-x-2">
                  <div className={`${['contract', 'address'].includes(type) ? 'h-8' : 'h-6'} flex items-center space-x-1`}>
                    {split(d.key, 'normal', '_').map((k, j) => {
                      switch (type) {
                        case 'contract':
                        case 'address':
                          const { explorer } = { ...toArray(d.chain).length > 0 && getChainData(_.head(toArray(d.chain)), chains_data) }
                          return (
                            <AccountProfile
                              key={j}
                              address={k}
                              ellipseLength={6}
                              copyAddress={true}
                              width={20}
                              height={20}
                              noCopy={true}
                              explorer={explorer}
                              url={type === 'address' && `/address/${k}${tab ? `?tab=${tab}` : ''}`}
                              className="normal-case text-xs font-medium"
                            />
                          )
                        case 'chain':
                        default:
                          const { name, image } = { ...getChainData(k, chains_data) }
                          return (
                            <Tooltip key={j} content={name}>
                              <div>
                                <Image
                                  src={image}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              </div>
                            </Tooltip>
                          ) 
                      }
                    })}
                  </div>
                  <NumberDisplay
                    value={d[field]}
                    format={numberFormat}
                    prefix={prefix}
                    noTooltip={true}
                    className="text-black dark:text-white text-xs font-semibold"
                  />
                </div>
              ))}
            </div> :
            <div className="w-full h-full flex items-center justify-center">
              <Spinner name="ProgressBar" width={36} height={36} />
            </div>
          }
        </div>
      </CardBody>
    </Card>
  )
}