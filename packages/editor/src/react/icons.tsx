// Los iconos, dibujados acá: un package sin dependencias no puede importar una librería, y
// resulta que no la quiere. Son paths cortos en una grilla de 24 que heredan `currentColor`.

import type { SVGProps } from 'react'

export type IconName =
  | 'text' | 'h1' | 'h2' | 'h3' | 'list' | 'listOrdered' | 'check' | 'chevron' | 'quote' | 'callout'
  | 'code' | 'divider' | 'image' | 'video' | 'audio' | 'file' | 'link' | 'embed' | 'table' | 'columns'
  | 'toc' | 'timer' | 'math' | 'choice' | 'multi' | 'number' | 'fillIn' | 'order' | 'match' | 'question'
  | 'evidence' | 'selfReport' | 'game' | 'figure'
  | 'grip' | 'plus' | 'trash' | 'copy' | 'bold' | 'italic' | 'underline' | 'strike' | 'palette'
  | 'search' | 'undo' | 'redo' | 'close' | 'drag' | 'more' | 'indent' | 'outdent' | 'arrowUp' | 'arrowDown'

/** Each icon is its path data, so the component below is the only markup in the file. */
const PATHS: Record<IconName, string> = {
  text: 'M5 6h14M5 12h14M5 18h9',
  h1: 'M4 6v12M4 12h8M12 6v12M17 18v-8l-2 1.5',
  h2: 'M4 6v12M4 12h8M12 6v12M16 12a2 2 0 1 1 4 0c0 1.5-4 3-4 6h4',
  h3: 'M4 6v12M4 12h8M12 6v12M16 11a2 2 0 1 1 3 2 2 2 0 1 1-3 2',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  listOrdered: 'M10 6h10M10 12h10M10 18h10M4 7l1.5-1v4M4 17.5c0-1 2-1 2 0s-2 1-2 2h2',
  check: 'M4 7.5h5v5H4zM6 10l1.5 1.5L10.5 8M13 10h7M13 16h7',
  chevron: 'M9 6l6 6-6 6',
  quote: 'M6 5v14M10 8h9M10 12h9M10 16h6',
  callout: 'M12 4a6 6 0 0 0-3 11v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2a6 6 0 0 0-3-11zM10 21h4',
  code: 'M9 8l-4 4 4 4M15 8l4 4-4 4',
  divider: 'M4 12h16',
  image: 'M4 5h16v14H4zM4 15l4-4 3 3 3-3 6 5M15 9.5h.01',
  video: 'M4 6h16v12H4zM10 9.5l5 2.5-5 2.5z',
  audio: 'M5 14v-4M9 17V7M13 15V9M17 12.5v-1M21 14v-4',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  link: 'M10 13a3 3 0 0 0 4 0l3-3a3 3 0 0 0-4-4l-1 1M14 11a3 3 0 0 0-4 0l-3 3a3 3 0 0 0 4 4l1-1',
  embed: 'M4 5h16v14H4zM4 9h16M7 7h.01M9.5 7h.01',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14',
  columns: 'M4 5h6v14H4zM14 5h6v14h-6z',
  toc: 'M5 7h3M11 7h8M5 12h3M11 12h8M5 17h3M11 17h8',
  timer: 'M12 8v4l3 2M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 3h6',
  math: 'M5 6h9l-5 6 5 6H5M17 9v6M14 12h6',
  choice: 'M5 8.5h4v4H5zM5 15.5h4v4H5zM12 10.5h7M12 17.5h7M6 10l1 1 1.5-2',
  multi: 'M5 7h4v4H5zM5 14h4v4H5zM12 9h7M12 16h7M6 9l1 1 1.5-2M6 16l1 1 1.5-2',
  number: 'M5 9l2-1.5v9M12 8h7M12 12h7M12 16h4',
  fillIn: 'M4 12h4M10 12h4M16 12h4M6 16v-8M18 16v-8',
  order: 'M6 5v14l-2-2M6 5l2 2M12 7h8M12 12h8M12 17h8',
  match: 'M5 8h4M5 16h4M15 8h4M15 16h4M9 8c3 0 3 8 6 8M9 16c3 0 3-8 6-8',
  question: 'M9 9a3 3 0 1 1 3 3v2M12 18h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  evidence: 'M4 8h4l2-2h4l2 2h4v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  selfReport: 'M4 18l4-6 4 3 4-7 4 4M4 6v14h16',
  game: 'M8 12h4M10 10v4M16 11h.01M18 13h.01M6 7h12a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z',
  figure: 'M4 16h16M8 16v-3M12 16v-6M16 16v-9M4 20h16',
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M10 5h7M7 19h7M14 5l-4 14',
  underline: 'M7 5v7a5 5 0 0 0 10 0V5M5 20h14',
  strike: 'M5 12h14M8 8a4 4 0 0 1 8 0M8 16a4 4 0 0 0 8 0',
  palette: 'M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-1a2 2 0 0 0-1 3.7A2 2 0 0 1 12 21zM7.5 10h.01M11 7h.01M15.5 9h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l4 4',
  undo: 'M4 10h9a5 5 0 0 1 0 10H8M4 10l4-4M4 10l4 4',
  redo: 'M20 10h-9a5 5 0 0 0 0 10h5M20 10l-4-4M20 10l-4 4',
  close: 'M6 6l12 12M18 6L6 18',
  drag: 'M12 3v18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  indent: 'M4 6h16M10 12h10M10 18h10M4 11l3 3-3 3',
  outdent: 'M4 6h16M10 12h10M10 18h10M7 11l-3 3 3 3',
  arrowUp: 'M12 20V4M12 4l-5 5M12 4l5 5',
  arrowDown: 'M12 4v16M12 20l-5-5M12 20l5-5',
}

export type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  /** In pixels. The stroke thickens slightly on small sizes so it stays visible. */
  size?: number
}

export function Icon({ name, size = 18, ...rest }: IconProps) {
  const d = PATHS[name] ?? PATHS.text
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={size <= 14 ? 1.9 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}

/** Whether a name is one we can draw, for a spec that asks for an icon we do not have. */
export const hasIcon = (name: string | undefined): name is IconName => Boolean(name && name in PATHS)
