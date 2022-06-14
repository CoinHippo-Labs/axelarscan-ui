export const chainName = data => data?.name && data.name.split(' ').length < 3 ? data.name : data?.short_name
export const getChain = (id, chains) => {
  const chain_data = chains?.find(c => [c?.id?.toLowerCase(), c?.maintainer_id?.toLowerCase()].concat(Object.keys({ ...c?.overrides })).filter(i => i).includes(id?.toLowerCase()))
  return chain_data && {
    ...chain_data,
    ...chain_data.overrides?.[id],
    _id: chain_data.id,
  }
}
export const chain_manager = {
  id: (id, chains) => getChain(id, chains)?.id || id,
  maintainer_id: (id, chains) => getChain(id, chains)?.maintainer_id || id,
  chain_id: (id, chains) => getChain(id, chains)?.chain_id,
  name: (id, chains) => getChain(id, chains)?.name,
  image: (id, chains) => getChain(id, chains)?.image,
}