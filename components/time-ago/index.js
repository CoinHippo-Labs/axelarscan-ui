import { useState, useEffect } from 'react'
import moment from 'moment'
import Popover from '../popover'

export default (
  {
    time,
    placement = 'top',
    title = 'time',
    titleClassName = 'h-8 text-xs font-semibold',
    className = '',
  },
) => {
  const [trigger, setTrigger] = useState(false)

  useEffect(
    () => {
      const timeout =
        setTimeout(() =>
          setTrigger(!trigger),
          1 * 1000,
        )

      return () => clearTimeout(timeout)
    },
    [trigger],
  )

  const _time =
    time &&
    moment(
      !isNaN(time) ?
        Number(time) :
        time
    )

  const second_ago =
    moment()
      .diff(
        _time,
        'seconds',
      )

  return (
    _time &&
    <Popover
      placement={placement}
      title={title}
      content={
        <div className="w-38 whitespace-nowrap text-xs font-normal">
          {
            _time
              .format('MMM D, YYYY h:mm:ss A')
          }
        </div>
      }
      titleClassName={titleClassName}
      className={className}
    >
      <div className={className}>
        <span className="normal-case text-slate-400 dark:text-slate-600 font-normal">
          {second_ago > 59 ?
            _time.fromNow() :
            <>
              {second_ago}s ago
            </>
          }
        </span>
      </div>
    </Popover>
  )
}