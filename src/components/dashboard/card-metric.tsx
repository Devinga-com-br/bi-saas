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
  comparisonLabel?: string
  // Comparação YTD (Year-to-Date)
  ytdValue?: string
  ytdVariationPercent?: string
  ytdLabel?: string
  ytdIsPositive?: boolean
}

export function CardMetric({
  title,
  value,
  previousValue,
  variationPercent,
  variationYear,
  isPositive,
  comparisonLabel = 'PA',
  ytdValue,
  ytdVariationPercent,
  ytdLabel,
  ytdIsPositive,
}: CardMetricProps) {
  const variationColor = isPositive ? 'text-emerald-500' : 'text-red-500'
  const VariationIcon = isPositive ? ArrowUp : ArrowDown
  
  const ytdVariationColor = ytdIsPositive ? 'text-emerald-500' : 'text-red-500'
  const YtdVariationIcon = ytdIsPositive ? ArrowUp : ArrowDown

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {/* Comparação YTD (se existir) */}
        {ytdValue && ytdVariationPercent && ytdLabel && (
          <p className="text-xs flex items-center mt-1">
            <span className="text-muted-foreground">{ytdLabel}: {ytdValue}</span>
            <span className="ml-1 text-muted-foreground">(</span>
            <YtdVariationIcon className={cn("h-3.5 w-3.5 mx-0.5", ytdVariationColor)} />
            <span className={ytdVariationColor}>{ytdVariationPercent}</span>
            <span className="text-muted-foreground">)</span>
          </p>
        )}
        
        {/* Comparação período anterior */}
        {previousValue && variationPercent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs flex items-center cursor-help mt-1">
                  <span className="text-muted-foreground">{comparisonLabel}: {previousValue}</span>
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