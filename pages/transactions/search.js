import TransactionsTable from '../../components/transactions/transactions-table'

export default function TransactionsSearch() {
  return (
    <div className="max-w-7xl my-2 xl:my-4 mx-auto">
      <TransactionsTable location="search" className="no-border" />
    </div>
  )
}