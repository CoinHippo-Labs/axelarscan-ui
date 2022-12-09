import { useSelector, shallowEqual } from 'react-redux'
import { ProgressBar } from 'react-loader-spinner'

import Datatable from '../datatable'
import AccountProfile from '../account-profile'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({
  data,
}) => {
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

  return (
    data ?
      <Datatable
        columns={
          [
            {
              Header: '#',
              accessor: 'i',
              sortType: (a, b) =>
                a.original.i > b.original.i ?
                  1 :
                  -1,
              Cell: props => (
                <span className="font-semibold">
                  {number_format(
                    (props.flatRows?.indexOf(props.row) > -1 ?
                      props.flatRows.indexOf(props.row) :
                      props.value
                    ) + 1,
                    '0,0',
                  )}
                </span>
              ),
            },
            {
              Header: 'Address',
              accessor: 'delegator_address',
              disableSortBy: true,
              Cell: props => (
                <div className="flex items-center space-x-1">
                  <AccountProfile
                    address={props.value}
                    ellipse_size={16}
                    url={true}
                  />
                  {
                    props.row.original.self &&
                    (
                      <span className="bg-blue-600 rounded-lg capitalize text-white text-xs font-semibold px-2 py-0.5">
                        Self
                      </span>
                    )
                  }
                </div>
              ),
            },
            {
              Header: 'Amount',
              accessor: 'amount',
              sortType: (a, b) =>
                a.original.amount > b.original.amount ?
                  1 :
                  -1,
              Cell: props => (
                <div className="flex flex-col text-left sm:text-right">
                  <div className="flex flex-col items-start sm:items-end space-y-1.5">
                    {typeof props.value === 'number' ?
                      <div className="font-semibold">
                        {number_format(
                          props.value,
                          '0,0.00000000',
                        )} {props.row.original.denom}
                      </div> :
                      <div>
                        -
                      </div>
                    }
                  </div>
                </div>
              ),
              headerClassName: 'justify-start sm:justify-end text-left sm:text-right',
            },
          ]
        }
        size="small"
        data={data}
        noPagination={data.length <= 10}
        defaultPageSize={10}
        className="no-border"
        style={
          {
            minHeight: 'calc(100% - 48px)',
          }
        }
      /> :
      <div>
        <div className="sm:-mt-2">
          <ProgressBar
            borderColor={loader_color(theme)}
            width="28"
            height="28"
          />
        </div>
      </div>
  )
}