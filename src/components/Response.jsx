'use client'

export function Response({ data }) {
  const { code, message } = { ...data }

  return (
    <div className="flex flex-col gap-y-2">
      <span className="text-zinc-900 dark:text-zinc-100 text-base font-semibold">
        {code}
      </span>
      <span className="break-all sm:break-normal text-zinc-400 dark:text-zinc-500 text-sm font-normal">
        {message}
      </span>
    </div>
  )
}
