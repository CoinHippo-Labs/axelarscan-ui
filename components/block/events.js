import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ProgressBar } from 'react-loader-spinner'
import { IoCaretUpCircle, IoCaretDownCircle } from 'react-icons/io5'

import Datatable from '../datatable'
import { number_format, loader_color } from '../../lib/utils'

const COLLAPSE_SIZE = 3
const BLOCK_EVENTS_FIELDS =
  [
    'begin_block_events',
    'end_block_events',
  ]

export default (
  {
    data,
  },
) => {
  const {
    preferences,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const [seeMoreTypes, setSeeMoreTypes] = useState([])

  const {
    begin_block_events,
    end_block_events,
  } = { ...data }

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {BLOCK_EVENTS_FIELDS
        .map((f,i) => (
          <div
            key={i}
            className="space-y-3"
          >
            <div className="capitalize tracking-wider text-base font-semibold">
              {f
                .split('_')
                .join(' ')
              }
            </div>
            {data ?
              data[f]?.length > 0 ?
                <Datatable
                  columns={
                    [
                      {
                        Header: 'Type',
                        accessor: 'type',
                        disableSortBy: true,
                        Cell: props => (
                          <div className="flex items-center mt-0.5">
                            <span className="font-semibold mr-1.5">
                              {props.value}
                            </span>
                            {
                              props.row.original.data?.length > 1 &&
                              (
                                <span>
                                  [
                                  {number_format(
                                    props.row.original.data.length,
                                    '0,0',
                                  )}
                                  ]
                                </span>
                              )
                            }
                          </div>
                        ),
                      },
                      {
                        Header: 'Data',
                        accessor: 'data',
                        disableSortBy: true,
                        Cell: props => {
                          const {
                            type,
                          } = { ...props.row.original }

                          return (
                            props.value?.length > 0 ?
                              <>
                                <div className="flex flex-col space-y-2">
                                  {_.slice(
                                    props.value,
                                    0,
                                    seeMoreTypes.includes(type) ?
                                      props.value.length :
                                      COLLAPSE_SIZE,
                                  )
                                  .map((d, j) => (
                                    <div
                                      key={j}
                                    >
                                      <pre className="bg-slate-50 dark:bg-slate-900 dark:bg-opacity-90 rounded-lg break-all text-2xs font-medium py-1 px-2">
                                        {JSON.stringify(
                                          d,
                                          null,
                                          2,
                                        )}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                                {(
                                  props.value.length > COLLAPSE_SIZE ||
                                  seeMoreTypes.includes(type)
                                ) && (
                                  <button
                                    onClick={() =>
                                      setSeeMoreTypes(
                                        seeMoreTypes.includes(type) ?
                                          seeMoreTypes
                                            .filter(t =>
                                              t !== type
                                            ) :
                                          _.uniq(
                                            _.concat(
                                              seeMoreTypes,
                                              type,
                                            )
                                          )
                                      )
                                    }
                                    className="max-w-min flex items-center capitalize text-blue-500 dark:text-white text-xs font-medium space-x-0.5 mt-1"
                                  >
                                    <span>
                                      See {
                                        seeMoreTypes.includes(type) ?
                                          'Less' :
                                          'More'
                                      }
                                    </span>
                                    {
                                      !seeMoreTypes.includes(type) &&
                                      (
                                        <span>
                                          (
                                            {number_format(
                                              props.value.length - COLLAPSE_SIZE,
                                              '0,0',
                                            )}
                                          )
                                        </span>
                                      )
                                    }
                                    {seeMoreTypes.includes(type) ?
                                      <IoCaretUpCircle
                                        size={16}
                                      /> :
                                      <IoCaretDownCircle
                                        size={16}
                                      />
                                    }
                                  </button>
                                )}
                              </> :
                              <div className="text-slate-400 dark:text-slate-200 text-base">
                                -
                              </div>
                          )
                        },
                      },
                    ]
                  }
                  data={data[f]}
                  noPagination={data[f].length <= 10}
                  defaultPageSize={10}
                  className="no-border"
                /> :
                <div className="tracking-wider text-slate-400 dark:text-slate-200 text-base">
                  No events
                </div> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="32"
                height="32"
              />
            }
          </div>
        ))
      }
    </div>
  )
}