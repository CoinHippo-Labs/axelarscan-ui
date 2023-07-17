import { Chip } from '@material-tailwind/react'
import Linkify from 'react-linkify'
import moment from 'moment'

import Spinner from '../../spinner'
import JSONView from '../../json-view'
import NumberDisplay from '../../number'
import { toArray, getTitle, toJson } from '../../../lib/utils'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'

export default ({ data }) => {
  const {
    type,
    content,
    status,
    submit_time,
    deposit_end_time,
    voting_start_time,
    voting_end_time,
    total_deposit,
  } = { ...data }
  const { plan, title, description, changes } = { ...content }
  const { height, info } = { ...plan }

  const rowClassName = 'flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2'
  const titleClassName = 'w-40 lg:w-64 tracking-wider text-slate-600 dark:text-slate-400 text-sm lg:text-base font-semibold'

  return (
    <div className="bg-slate-50 dark:bg-slate-900 w-fit flex flex-col rounded-lg space-y-4 p-6">
      <div className={rowClassName}>
        <span className={titleClassName}>Title:</span>
        {data ?
          <span className="text-sm lg:text-base font-semibold">
            {title}
          </span> :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Description:</span>
        {data ?
          <span className="max-w-xl linkify break-words whitespace-pre-wrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
            <Linkify>
              {description}
            </Linkify>
          </span> :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Status:</span>
        {data ?
          status && (
            <Chip
              color={['UNSPECIFIED', 'DEPOSIT_PERIOD'].includes(status) ? 'cyan' : ['VOTING_PERIOD'].includes(status) ? 'amber' : ['REJECTED', 'FAILED'].includes(status) ? 'red' : 'green'}
              value={getTitle(status)}
              className="chip font-medium"
            />
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      {(!data || type) && (
        <div className={rowClassName}>
          <span className={titleClassName}>Type:</span>
          {data ?
            <Chip
              value={getTitle(type)}
              className="chip normal-case font-medium"
            /> :
            <Spinner name="ProgressBar" />
          }
        </div>
      )}
      {plan && (
        <>
          <div className={rowClassName}>
            <span className={titleClassName}>Plan:</span>
            <span className="text-sm lg:text-base font-semibold">
              {plan.name}
            </span>
          </div>
          <div className={rowClassName}>
            <span className={titleClassName}>Block:</span>
            <NumberDisplay
              value={height}
              format="0,0"
              noTooltip={true}
              className="text-sm lg:text-base font-semibold"
            />
          </div>
          {info && (
            <div className={rowClassName}>
              <span className={titleClassName}>{getTitle(type)}:</span>
              <div className="text-sm lg:text-base font-medium">
                {typeof toJson(info) === 'object' ?
                  <JSONView value={info} /> :
                  <div className="bg-slate-100 dark:bg-slate-800 rounded capitalize p-3">
                    {info}
                  </div>
                }
              </div>
            </div>
          )}
        </>
      )}
      {toArray(changes).filter(c => c.subspace).map((c, i) => {
        const { key, value, subspace } = { ...c }
        return (
          <div key={i} className={rowClassName}>
            <span className={titleClassName}>{getTitle(subspace)}:</span>
            <div className="text-sm lg:text-base font-medium">
              {typeof toJson(value) === 'object' ?
                <div className="space-y-2">
                  <Chip
                    color="amber"
                    value={getTitle(key)}
                    className="chip normal-case font-medium"
                  />
                  <JSONView value={value} />
                </div> :
                <Chip
                  color="cyan"
                  value={`${getTitle(key)} = ${value}`}
                  className="chip normal-case font-medium"
                />
              }
            </div>
          </div>
        )
      })}
      <div className={rowClassName}>
        <span className={titleClassName}>Submit Time:</span>
        {data ?
          submit_time && (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
              {moment(submit_time).fromNow()} ({moment(submit_time).format(TIME_FORMAT)})
            </span>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Deposit End Time:</span>
        {data ?
          deposit_end_time && (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
              {moment(deposit_end_time).fromNow()} ({moment(deposit_end_time).format(TIME_FORMAT)})
            </span>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Voting Start Time:</span>
        {data ?
          voting_start_time && (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
              {moment(voting_start_time).fromNow()} ({moment(voting_start_time).format(TIME_FORMAT)})
            </span>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Voting End Time:</span>
        {data ?
          voting_end_time && (
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-sm lg:text-base font-normal">
              {moment(voting_end_time).fromNow()} ({moment(voting_end_time).format(TIME_FORMAT)})
            </span>
          ) :
          <Spinner name="ProgressBar" />
        }
      </div>
      <div className={rowClassName}>
        <span className={titleClassName}>Total Deposit:</span>
        {data ?
          <div className="flex flex-col space-y-1">
            {total_deposit ?
              toArray(total_deposit).map((d, i) => {
                const { symbol, amount } = { ...d }
                return (
                  <NumberDisplay
                    key={i}
                    value={amount}
                    suffix={` ${symbol}`}
                    noTooltip={true}
                    className="text-sm lg:text-base font-semibold"
                  />
                )
              }) :
              '-'
            }
          </div> :
          <Spinner name="ProgressBar" />
        }
      </div>
    </div>
  )
}