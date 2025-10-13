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
  variationMonth?: string
  variationYear?: string
  isPositiveMonth?: boolean
}

export function CardMetric({
  title,
  value,
  variationMonth,
  variationYear,
  isPositiveMonth,
}: CardMetricProps) {
  const variationColor = isPositiveMonth ? 'text-emerald-500' : 'text-red-500'
  const VariationIcon = isPositiveMonth ? ArrowUp : ArrowDown

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {variationMonth && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className={cn(
                    'text-xs text-muted-foreground flex items-center cursor-help',
                    variationColor
                  )}
                >
                  <VariationIcon className="h-4 w-4 mr-1" />
                  {variationMonth} vs. mês anterior
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