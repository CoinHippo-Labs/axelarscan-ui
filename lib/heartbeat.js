export const NUM_BLOCKS_PER_HEARTBEAT = 50

export const endBlock = (height, numBlocks = NUM_BLOCKS_PER_HEARTBEAT, fraction = 1) => {
  height = Number(height) + numBlocks
  while (height > 0 && height % numBlocks !== fraction) {
    height--
  }
  return height - 1
}

export const startBlock = height => endBlock(Number(height) - NUM_BLOCKS_PER_HEARTBEAT) + 1