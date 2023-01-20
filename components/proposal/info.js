import dynamic from 'next/dynamic'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import Linkify from 'react-linkify'
import { ProgressBar } from 'react-loader-spinner'

import { number_format, name, to_json, loader_color, json_theme } from '../../lib/utils'

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

  const ReactJson =
    typeof window !== 'undefined' &&
    dynamic(
      import('react-json-view')
    )

  const {
    content,
    status,
    type,
    submit_time,
    deposit_end_time,
    voting_start_time,
    voting_end_time,
    total_deposit,
  } = { ...data }
  const {
    plan,
    title,
    description,
    changes,
  } = { ...content }
  const {
    height,
    info,
  } = { ...plan }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-300 text-sm lg:text-base font-medium'

  return (
    <div className="bg-slate-100 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 w-fit flex flex-col rounded-lg space-y-4 py-6 px-5">
      <div className={rowClassName}>
        <span className={titleClassName}>
          Title:
        </span>
        {data ?
          <span className="text-sm lg:text-base font-medium">
            {title}
          </span> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Description:
        </span>
        {data ?
          <span className="max-w-xl linkify break-words whitespace-pre-wrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
            <Linkify>
              {description}
            </Linkify>
          </span> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Status:
        </span>
        {data ?
          status &&
          (
            <span className={`${['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(status) ? 'bg-slate-200 dark:bg-slate-800' : ['VOTING_PERIOD', 'DEPOSIT_PERIOD'].includes(status) ? 'bg-yellow-200 dark:bg-yellow-300 border-2 border-yellow-400 dark:border-yellow-600 text-yellow-500 dark:text-yellow-700' : ['REJECTED', 'FAILED'].includes(status) ? 'bg-red-200 dark:bg-red-300 border-2 border-red-400 dark:border-red-600 text-red-500 dark:text-red-700' : 'bg-green-200 dark:bg-green-300 border-2 border-green-400 dark:border-green-600 text-green-500 dark:text-green-700'} rounded-xl font-semibold py-0.5 px-2`}>
              {
                status
                  .replace(
                    '_',
                    ' ',
                  )
              }
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      {
        (
          !data ||
          type
        ) &&
        (
          <div className={rowClassName}>
            <span className={titleClassName}>
              Type:
            </span>
            {data ?
              <div className="max-w-min bg-slate-200 dark:bg-slate-800 rounded font-medium py-1 px-2">
                {name(type)}
              </div> :
              <ProgressBar
                borderColor={loader_color(theme)}
                width="24"
                height="24"
              />
            }
          </div>
        )
      }
      {
        plan &&
        (
          <>
            <div className={rowClassName}>
              <span className={titleClassName}>
                Plan:
              </span>
              <span className="text-sm lg:text-base font-medium">
                {plan.name}
              </span>
            </div>
            <div className={rowClassName}>
              <span className={titleClassName}>
                Block:
              </span>
              <span className="text-sm lg:text-base font-medium">
                {number_format(
                  height,
                  '0,0',
                )}
              </span>
            </div>
            {
              info &&
              (
                <div className={rowClassName}>
                  <span className={titleClassName}>
                    {name(type)}:
                  </span>
                  <div className="text-sm lg:text-base font-medium">
                    {typeof to_json(info) === 'object' ?
                      <div className="max-w-lg max-h-96 overflow-y-auto rounded-xl text-xs">
                        <ReactJson
                          src={to_json(info)}
                          theme={json_theme(theme)}
                          style={
                            {
                              padding: '.8rem .75rem',
                            }
                          }
                        />
                      </div> :
                      <div className="bg-slate-200 dark:bg-slate-800 rounded capitalize py-0.5 px-2">
                        {info}
                      </div>
                    }
                  </div>
                </div>
              )
            }
          </>
        )
      }
      {(changes || [])
        .filter(c => c?.subspace)
        .map((c, i) => {
          const {
            key,
            value,
            subspace,
          } = { ...c }

          return (
            <div
              key={i}
              className={rowClassName}
            >
              <span className={titleClassName}>
                {name(subspace)}:
              </span>
              <div className="text-sm lg:text-base font-medium">
                {typeof to_json(value) === 'object' ?
                  <div className="space-y-2">
                    <span className="bg-slate-200 dark:bg-slate-800 rounded capitalize py-0.5 px-2">
                      {name(key)}
                    </span>
                    <div className="max-w-lg max-h-96 overflow-y-auto rounded-xl text-xs">
                      <ReactJson
                        src={to_json(value)}
                        theme={json_theme(theme)}
                        style={
                          {
                            padding: '.8rem .75rem',
                          }
                        }
                      />
                    </div>
                  </div> :
                  <span className="bg-slate-200 dark:bg-slate-800 rounded capitalize whitespace-nowrap py-0.5 px-2">
                    {name(key)} = {value}
                  </span>
                }
              </div>
            </div>
          )
        })
      }
      <div className={rowClassName}>
        <span className={titleClassName}>
          Submit Time:
        </span>
        {data ?
          submit_time &&
          (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              {
                moment(submit_time)
                  .fromNow()
              } ({
                moment(submit_time)
                  .format('MMM D, YYYY h:mm:ss A')
              })
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Deposit End Time:
        </span>
        {data ?
          deposit_end_time &&
          (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              {
                moment(deposit_end_time)
                  .fromNow()
              } ({
                moment(deposit_end_time)
                  .format('MMM D, YYYY h:mm:ss A')
              })
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Voting Start Time:
        </span>
        {data ?
          voting_start_time &&
          (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              {
                moment(voting_start_time)
                  .fromNow()
              } ({
                moment(voting_start_time)
                  .format('MMM D, YYYY h:mm:ss A')
              })
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Voting End Time:
        </span>
        {data ?
          voting_end_time &&
          (
            <span className="text-slate-400 dark:text-slate-600 text-sm lg:text-base font-normal">
              {
                moment(voting_end_time)
                  .fromNow()
              } ({
                moment(voting_end_time)
                  .format('MMM D, YYYY h:mm:ss A')
              })
            </span>
          ) :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>
          Total Deposit:
        </span>
        {data ?
          <div className="flex flex-col space-y-1.5">
            {total_deposit ?
              total_deposit
                .map((d, i) => {
                  const {
                    amount,
                    denom,
                    symbol,
                  } = { ...d }

                  return (
                    <span
                      key={i}
                      className="text-sm lg:text-base font-medium space-x-1"
                    >
                      <span>
                        {number_format(
                          amount,
                          '0,0.00',
                        )}
                      </span>
                      <span>
                        {
                          symbol ||
                          denom
                        }
                      </span>
                    </span>
                  )
                }) :
              <span>
                -
              </span>
            }
          </div> :
          <ProgressBar
            borderColor={loader_color(theme)}
            width="24"
            height="24"
          />
        }
      </div>
    </div>
  )
}