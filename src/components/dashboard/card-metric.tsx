import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp } from 'lucide-react'

interface CardMetricProps {
  title: string
  value: string
  previousValue?: string
  variationPercent?: string
  variationYear?: string
  isPositive?: boolean
}

export function CardMetric({
  title,
  value,
  previousValue,
  variationPercent,
  variationYear,
  isPositive,
}: CardMetricProps) {
  const variationColor = isPositive ? 'text-emerald-500' : 'text-red-500'
  const VariationIcon = isPositive ? ArrowUp : ArrowDown

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {previousValue && variationPercent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs flex items-center cursor-help mt-1">
                  <span className="text-muted-foreground">PA: {previousValue}</span>
                  <span className="ml-1 text-muted-foreground">(</span>
                  <VariationIcon className={cn("h-3.5 w-3.5 mx-0.5", variationColor)} />
                  <span className={variationColor}>{variationPercent}</span>
                  <span className="text-muted-foreground">)</span>
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>{variationYear} vs. mesmo período do ano anterior</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}