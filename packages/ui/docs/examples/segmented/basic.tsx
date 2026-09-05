import { useState } from 'react'
import { SegmentedControl, SegmentedControlItem } from '@melu/ui'

export default function Demo() {
  const [period, setPeriod] = useState('week')
  return (
    <SegmentedControl value={period} onValueChange={setPeriod} label="Período">
      <SegmentedControlItem value="day">Día</SegmentedControlItem>
      <SegmentedControlItem value="week">Semana</SegmentedControlItem>
      <SegmentedControlItem value="month">Mes</SegmentedControlItem>
    </SegmentedControl>
  )
}
