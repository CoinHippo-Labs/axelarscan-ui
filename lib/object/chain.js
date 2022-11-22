import _ from 'lodash'

export const chainName = data =>
  data?.name &&
  data.name
    .split(' ')
    .length < 3 ?
    data.name :
    data?.short_name

export const getChain = (
  id = '',
  chains_data,
  latest = false,
) => {
  id =
    id
      .trim()
      .split('"')
      .join('')
      .toLowerCase()

  const chain_data = (chains_data || [])
    .find(c =>
      _.concat(
        c?.id?.toLowerCase(),
        c?.maintainer_id?.toLowerCase(),
        Object.keys({ ...c?.overrides }),
      )
      .filter(id => id)
      .includes(id) ||
      (c?.prefix_chain_ids || [])
        .findIndex(p =>
          id.startsWith(p)
        ) > -1
    )

  const {
    overrides,
  } = { ...chain_data }

  return (
    chain_data &&
    {
      ...chain_data,
      ...(
        latest &&
        overrides ?
          {
            ...(
              Object.fromEntries(
                _.slice(
                  _.last(
                    Object.entries(overrides)
                  ),
                  -1,
                )
              )
            ),
          } :
          {
            ...overrides?.[id],
          }
      ),
      _id: chain_data.id,
    }
  )
}

export const chainManager = {
  id: (
    id,
    chains_data,
  ) =>
    getChain(
      id,
      chains_data,
    )?.id ||
    id,
  maintainer_id: (
    id,
    chains_data,
  ) =>
    getChain(
      id,
      chains_data,
    )?.maintainer_id ||
    id,
  chain_id: (
    id,
    chains_data,
  ) =>
    getChain(
      id,
      chains_data,
    )?.chain_id,
  name: (
    id,
    chains_data,
  ) =>
    getChain(
      id,
      chains_data,
    )?.name,
  image: (
    id,
    chains_data,
  ) =>
    getChain(
      id,
      chains_data,
    )?.image,
}