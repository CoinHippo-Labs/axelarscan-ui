export const blocksPerHeartbeat = Number(process.env.NEXT_PUBLIC_NUM_BLOCKS_PER_HEARTBEAT)
export const blockFraction = Number(process.env.NEXT_PUBLIC_HEARTBEAT_BLOCK_FRACTION)

export const lastHeartbeatBlock = height => {
  while (height > 0 && height % blocksPerHeartbeat !== blockFraction) {
    height--
  }

  return height
}

export const firstHeartbeatBlock = height => lastHeartbeatBlock(height)