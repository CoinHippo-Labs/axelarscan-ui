'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import _ from 'lodash'
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from 'react-icons/md'

import { Button } from '@/components/Button'
import { Number } from '@/components/Number'
import { getParams, getQueryString } from '@/lib/operator'
import { isNumber, toNumber } from '@/lib/number'

export function Pagination({
  maxPage = 5,
  sizePerPage = 25,
  total,
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const params = getParams(searchParams, sizePerPage)

  const page = toNumber(params.from) / sizePerPage + 1
  const half = Math.floor(toNumber(maxPage) / 2)
  const totalPage = Math.ceil(toNumber(total) / sizePerPage)

  const pages = _.range(page - half, page + half + 1).filter(p => p > 0 && p <= totalPage)
  const prev = _.min(_.range(_.head(pages) - maxPage, _.head(pages)).filter(p => p > 0))
  const next = _.max(_.range(_.last(pages) + 1, _.last(pages) + maxPage + 1).filter(p => p <= totalPage))

  return (
    <div className="flex items-center justify-center gap-x-1.5">
      {isNumber(prev) && (
        <Button
          color="none"
          href={`${pathname}${getQueryString({ ...params, page: prev })}`}
          className="!px-1.5"
        >
          <MdKeyboardDoubleArrowLeft size={22} />
        </Button>
      )}
      {pages.map(p => (
        <Button
          key={p}
          color={p === page ? 'blue' : 'default'}
          href={`${pathname}${getQueryString({ ...params, page: p })}`}
          className="rounded-xl"
        >
          <Number value={p} />
        </Button>
      ))}
      {isNumber(next) && (
        <Button
          color="none"
          href={`${pathname}${getQueryString({ ...params, page: next })}`}
          className="!px-1.5"
        >
          <MdKeyboardDoubleArrowRight size={22} />
        </Button>
      )}
    </div>
  )
}

export function TablePagination({
  data,
  value = 1,
  maxPage = 5,
  sizePerPage = 25,
  onChange,
}) {
  const [page, setPage] = useState(value)

  useEffect(() => {
    if (value) {
      setPage(value)
    }
  }, [value, setPage])

  useEffect(() => {
    if (page && onChange) {
      onChange(page)
    }
  }, [page, onChange])

  const half = Math.floor(toNumber(maxPage) / 2)
  const totalPage = Math.ceil(toNumber(data.length) / sizePerPage)

  const pages = _.range(page - half, page + half + 1).filter(p => p > 0 && p <= totalPage)
  const prev = _.min(_.range(_.head(pages) - maxPage, _.head(pages)).filter(p => p > 0))
  const next = _.max(_.range(_.last(pages) + 1, _.last(pages) + maxPage + 1).filter(p => p <= totalPage))

  return (
    <div className="flex items-center justify-center gap-x-1">
      {isNumber(prev) && (
        <Button
          color="none"
          onClick={() => setPage(prev)}
          className="!px-1"
        >
          <MdKeyboardDoubleArrowLeft size={18} />
        </Button>
      )}
      {pages.map(p => (
        <Button
          key={p}
          color={p === page ? 'blue' : 'default'}
          onClick={() => setPage(p)}
          className="!text-2xs !px-3 !py-1"
        >
          <Number value={p} />
        </Button>
      ))}
      {isNumber(next) && (
        <Button
          color="none"
          onClick={() => setPage(next)}
          className="!px-1"
        >
          <MdKeyboardDoubleArrowRight size={18} />
        </Button>
      )}
    </div>
  )
}
