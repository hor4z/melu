const AVATAR_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3", "#FF33A1", "#FF8C33", "#8D33FF"]

/** @returns Random color from predefined palette based on input string */
export const ranco = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}
