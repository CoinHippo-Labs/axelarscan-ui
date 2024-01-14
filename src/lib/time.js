import moment from 'moment'

export const timeDiff = (fromTime = moment().subtract(5, 'minutes'), unit = 'seconds', toTime = moment(), exact = false) => moment(toTime).diff(moment(fromTime), unit, exact)
