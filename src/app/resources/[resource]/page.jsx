import { Resources } from '@/components/Resources'

export default ({ params }) => {
  const { resource } = { ...params }
  return <Resources resource={resource} />
}
