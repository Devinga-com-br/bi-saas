'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { RupturaFilters } from './components/ruptura-filters'
import { RupturaTable } from './components/ruptura-table'
import { RupturaChart } from './components/ruptura-chart'
import { useTenantContext } from '@/contexts/tenant-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type ReportFilters, type RupturaResponse } from './types'

export default function RupturaPage() {
  const { currentTenant } = useTenantContext()
  const [filters, setFilters] = useState<ReportFilters>({
    mes: new Date().getMonth(), // Mês atual
    ano: new Date().getFullYear(),
    page: 1,
    pageSize: 10
  })

  const { data, isLoading } = useSWR<RupturaResponse>(
    ['/api/relatorios/ruptura', filters],
    async ([url, filters]) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: currentTenant?.supabase_schema,
          ...filters
        })
      })
      if (!res.ok) throw new Error('Erro ao carregar dados')
      return res.json()
    }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatório de Ruptura - Curva A</h1>
        <p className="text-muted-foreground">
          Análise de produtos em ruptura de estoque classificados como Curva A.
        </p>
      </div>

      <RupturaFilters 
        filters={filters}
        onChange={setFilters}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total em Ruptura</CardTitle>
            <CardDescription>Produtos Curva A</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '-' : data?.data.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departamentos Afetados</CardTitle>
            <CardDescription>Com produtos em ruptura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '-' : new Set(data?.data.map(item => item.departamento_id)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Índice de Ruptura</CardTitle>
            <CardDescription>Curva A</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '-' : `${((data?.data.length || 0) / 100 * 100).toFixed(1)}%`}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tabela">
        <TabsList>
          <TabsTrigger value="tabela">Tabela</TabsTrigger>
          <TabsTrigger value="grafico">Gráfico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tabela" className="space-y-4">
          <RupturaTable 
            data={data?.data} 
            isLoading={isLoading} 
          />
          
          <div className="flex justify-center">
            <Pagination
              page={filters.page}
              total={data?.total || 0}
              pageSize={filters.pageSize}
              onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="grafico">
          <RupturaChart data={data?.data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}