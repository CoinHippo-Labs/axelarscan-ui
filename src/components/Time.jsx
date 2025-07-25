'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import moment from 'moment'

import { Tooltip } from '@/components/Tooltip'
import { isNumber } from '@/lib/number'
import { timeDiff, timeDiffString } from '@/lib/time'

const TIME_FORMAT = 'MMM D, YYYY h:mm:ss A'

export function TimeAgo({
  timestamp,
  format = TIME_FORMAT,
  noTooltip = false,
  title,
  className,
}) {
  const [trigger, setTrigger] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setTrigger(!trigger), 1000)
    return () => clearTimeout(timeout)
  }, [trigger, setTrigger])

  if (!(timestamp || isNumber(timestamp))) return

  const time = moment(timestamp)
  const diff = timeDiff(time)
  const timeDisplay = diff > 59 || diff <= 0 ? time.fromNow() : `${diff}s ago`

  // update format when diff < 30 days
  if (diff < 30 * 24 * 60 * 60 && format === TIME_FORMAT) {
    format = 'MMM D, H:mm:ss'
  }

  const element = (
    <span className={clsx('text-zinc-400 dark:text-zinc-500 font-normal whitespace-nowrap', className)}>
      {timeDisplay}
    </span>
  )

  return noTooltip ? element : (
    <Tooltip content={`${title ? `${title} ` : ''}${time.format(format)}`} className="whitespace-nowrap">
      {element}
    </Tooltip>
  )
}

export function TimeSpent({
  fromTimestamp,
  toTimestamp,
  format = TIME_FORMAT,
  noTooltip = true,
  title,
  className,
}) {
  const [trigger, setTrigger] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setTrigger(!trigger), 1000)
    return () => clearTimeout(timeout)
  }, [trigger, setTrigger])

  if (!(fromTimestamp || isNumber(fromTimestamp))) return

  const fromTime = moment(fromTimestamp)
  const toTime = toTimestamp ? moment(toTimestamp) : moment()
  const timeDisplay = timeDiffString(fromTime, toTime)

  // update format when diff < 365 days
  if (timeDiff(fromTime, 'seconds', toTime) < 365 * 24 * 60 * 60 && format === TIME_FORMAT) {
    format = 'MMM D, H:mm:ss'
  }

  const element = (
    <span className={clsx('text-zinc-400 dark:text-zinc-500 font-normal whitespace-nowrap', className)}>
      {timeDisplay}
    </span>
  )

  return noTooltip ? element : (
    <Tooltip content={`${title ? `${title} ` : ''}${fromTime.format(format)} - ${toTime.format(format)}`} className="whitespace-nowrap">
      {element}
    </Tooltip>
  )
}

export function TimeUntil({
  timestamp,
  format = TIME_FORMAT,
  prefix,
  suffix,
  noTooltip = true,
  title,
  className,
}) {
  const [trigger, setTrigger] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setTrigger(!trigger), 1000)
    return () => clearTimeout(timeout)
  }, [trigger, setTrigger])

  if (!(timestamp || isNumber(timestamp))) return

  const time = moment(timestamp)

  if (!(timeDiff(moment(), 'seconds', time) > 0)) return

  const timeDisplay = timeDiffString(moment(), time)

  // update format when diff < 365 days
  if (timeDiff(moment(), 'seconds', time) < 365 * 24 * 60 * 60 && format === TIME_FORMAT) {
    format = 'MMM D, H:mm:ss'    
  }

  const element = (
    <span className={clsx('text-zinc-400 dark:text-zinc-500 font-normal whitespace-nowrap', className)}>
      {prefix}{timeDisplay}{suffix}
    </span>
  )

  return noTooltip ? element : (
    <Tooltip content={`${title ? `${title} ` : ''}${time.format(format)}`} className="whitespace-nowrap">
      {element}
    </Tooltip>
  )
}
