import { Button } from '@/components/Button'

export default function NotFound() {
  return (
    <div className="relative flex min-h-full shrink-0 justify-center md:px-12 lg:px-0">
      <div className="relative z-10 flex flex-1 flex-col px-4 py-10 sm:justify-center md:flex-none md:px-28">
        <main className="mx-auto w-full max-w-md sm:px-4 md:w-96 md:max-w-sm md:px-0">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            404
          </p>
          <h1 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Page not found
          </h1>
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Sorry, we couldn’t find the page you’re looking for.
          </p>
          <Button href="/" color="blue" className="mt-10">
            Go back home
          </Button>
        </main>
      </div>
    </div>
  )
}
