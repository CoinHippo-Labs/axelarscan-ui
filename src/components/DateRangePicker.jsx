import { DatePicker } from 'antd'
import clsx from 'clsx'
import _ from 'lodash'
import moment from 'moment'
import dayjs from 'dayjs'

import { isNumber, toNumber } from '@/lib/number'

export const createDayJSFromUnixtime = unixtime => dayjs(unixtime ? isNumber(unixtime) ? toNumber(unixtime) * 1000 : unixtime : undefined)

const getUnixtime = time => time && moment(time.valueOf()).unix()

export function DateRangePicker({ params, format = 'YYYY/MM/DD HH:mm:ss', onChange, className }) {
  const { fromTime, toTime } = { ...params }
  return (
    <DatePicker.RangePicker
      showTime
      format={format}
      presets={[
        { label: 'Today', value: [moment().startOf('day'), moment().endOf('day')] },
        { label: 'Last 24 Hours', value: [moment().subtract(24, 'hours'), moment().endOf('hour')] },
        { label: 'Last 7 Days', value: [moment().subtract(7, 'days').startOf('day'), moment().endOf('day')] },
        { label: 'This Month', value: [moment().startOf('month'), moment().endOf('month')] },
        { label: 'Last Month', value: [moment().subtract(1, 'months').startOf('month'), moment().subtract(1, 'months').endOf('month')] },
        { label: 'Last 30 Days', value: [moment().subtract(30, 'days').startOf('day'), moment().endOf('day')] },
        { label: 'Last 90 Days', value: [moment().subtract(90, 'days').startOf('day'), moment().endOf('day')] },
        { label: 'Last 180 Days', value: [moment().subtract(180, 'days').startOf('day'), moment().endOf('day')] },
        { label: 'Last 365 Days', value: [moment().subtract(365, 'days').startOf('day'), moment().endOf('day')] },
        { label: 'This Year', value: [moment().startOf('year'), moment().endOf('year')] },
        { label: 'Last Year', value: [moment().subtract(1, 'years').startOf('year'), moment().subtract(1, 'years').endOf('year')] },
        { label: 'All Time', value: [] },
      ]}
      value={fromTime && toTime ? [createDayJSFromUnixtime(fromTime), createDayJSFromUnixtime(toTime)] : undefined}
      onChange={v => onChange({ fromTime: getUnixtime(_.head(v)), toTime: getUnixtime(_.last(v)) })}
      className={clsx('py-2', className)}
    />
  )
}
