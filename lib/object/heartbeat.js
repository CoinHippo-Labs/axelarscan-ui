export const blocks_per_heartbeat =
  Number(
    process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT
  )

export const block_fraction =
  Number(
    process.env.NEXT_PUBLIC_HEARTBEAT_BLOCK_FRACTION
  )

export const lastHeartbeatBlock = height => {
  while (
    height > 0 &&
    height % blocks_per_heartbeat !== block_fraction
  ) {
    height--
  }

  return height
}

export const firstHeartbeatBlock = height => lastHeartbeatBlock(height)