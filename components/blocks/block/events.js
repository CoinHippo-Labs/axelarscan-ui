import { useState } from 'react'
import { Chip } from '@material-tailwind/react'
import _ from 'lodash'
import { BsFillCaretUpFill, BsFillCaretDownFill } from 'react-icons/bs'

import Spinner from '../../spinner'
import JSONView from '../../json-view'
import Datatable from '../../datatable'
import NumberDisplay from '../../number'
import { split, toArray, getTitle } from '../../../lib/utils'

const FIELDS = ['begin_block_events', 'end_block_events']
const PAGE_SIZE = 10
const COLLAPSE_SIZE = 3

export default ({ data }) => {
  const [seeMoreTypes, setSeeMoreTypes] = useState([])

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {FIELDS.map((f, i) => (
        <div key={i} className="space-y-3">
          <Chip
            value={split(f, 'normal', '_').join(' ')}
            className="chip text-2xs font-medium py-0.5 px-2"
          />
          {data ?
            toArray(data[f]).length > 0 ?
              <Datatable
                columns={[
                  {
                    Header: 'Type',
                    accessor: 'type',
                    disableSortBy: true,
                    Cell: props => {
                      const { value, row } = { ...props }
                      const { data } = { ...row.original }
                      return (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">
                            {getTitle(_.last(split(value, 'normal', '.')))}
                          </span>
                          {toArray(data).length > 1 && (
                            <NumberDisplay
                              value={toArray(data).length}
                              format="0,0"
                              prefix="["
                              suffix="]"
                            />
                          )}
                        </div>
                      )
                    },
                  },
                  {
                    Header: 'Data',
                    accessor: 'data',
                    disableSortBy: true,
                    Cell: props => {
                      const { row } = { ...props }
                      let { value } = { ...props }
                      const { type } = { ...row.original }
                      value = toArray(value)
                      return (
                        value.length > 0 ?
                          <div className="space-y-2">
                            {_.slice(value, 0, seeMoreTypes.includes(type) ? value.length : COLLAPSE_SIZE).map((d, j) => (
                              <JSONView
                                key={j}
                                value={d}
                                tab={2}
                                className="max-w-sm max-h-96 overflow-y-auto whitespace-pre text-slate-600 dark:text-slate-200 text-xs"
                              />
                            ))}
                            {(value.length > COLLAPSE_SIZE || seeMoreTypes.includes(type)) && (
                              <button
                                onClick={() => setSeeMoreTypes(seeMoreTypes.includes(type) ? seeMoreTypes.filter(t => t !== type) : _.uniq(_.concat(seeMoreTypes, type)))}
                                className="max-w-min flex items-center text-blue-400 dark:text-blue-500 text-xs font-medium space-x-1"
                              >
                                <span>See {seeMoreTypes.includes(type) ? 'Less' : 'More'}</span>
                                {!seeMoreTypes.includes(type) && <span>{value.length - COLLAPSE_SIZE}</span>}
                                {seeMoreTypes.includes(type) ? <BsFillCaretUpFill size={16} /> : <BsFillCaretDownFill size={16} />}
                              </button>
                            )}
                          </div> :
                          '-'
                      )
                    },
                  },
                ]}
                data={toArray(data[f])}
                defaultPageSize={PAGE_SIZE}
                noPagination={toArray(data[f]).length < PAGE_SIZE}
                className="no-border no-shadow"
              /> :
              <div className="text-slate-400 dark:text-slate-500 text-base font-medium">
                No events
              </div> :
            <div className="p-3">
              <Spinner name="ProgressBar" width={36} height={36} />
            </div>
          }
        </div>
      ))}
    </div>
  )
}