import { Skeleton } from '@melu/ui'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md items-center gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
