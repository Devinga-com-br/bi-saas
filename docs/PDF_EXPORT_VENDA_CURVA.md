# Exportação de PDF - Relatório Venda por Curva

## Visão Geral

Implementada a funcionalidade de exportação para PDF no relatório "Venda por Curva", seguindo o mesmo padrão do relatório "Ruptura ABCD".

## Características da Exportação

### 1. Formato do PDF
- **Orientação:** Paisagem (Landscape)
- **Formato:** A4
- **Fonte:** Helvetica

### 2. Estrutura do PDF

#### Cabeçalho
- Título: "Relatório de Venda por Curva ABC"
- Filial selecionada
- Período (Mês/Ano)
- Total de departamentos
- Data da geração

#### Tabela de Dados
A tabela é estruturada hierarquicamente:

1. **Departamento Nível 3** (Header Principal - Azul)
   - Nome do departamento
   - Total de vendas
   - Total de lucro
   - Margem percentual

2. **Departamento Nível 2** (Sub-header - Azul Claro)
   - Nome do departamento
   - Totalizadores

3. **Departamento Nível 1** (Grupo - Cinza)
   - Nome do departamento
   - Totalizadores

4. **Produtos** (Linhas de Dados)
   - Código
   - Descrição (limitada a 40 caracteres)
   - Quantidade
   - Valor de Vendas
   - Curva de Venda
   - Valor de Lucro
   - Percentual de Lucro
   - Curva de Lucro
   - Filial

#### Rodapé
- Número da página (formato: "Página X de Y")
- Centralizado na parte inferior

### 3. Colunas da Tabela

| Coluna | Largura | Alinhamento |
|--------|---------|-------------|
| Código | 20mm | Esquerda |
| Descrição | 70mm | Esquerda |
| Qtde | 20mm | Direita |
| Valor Vendas | 30mm | Direita |
| Curva Venda | 20mm | Centro |
| Valor Lucro | 30mm | Direita |
| % Lucro | 20mm | Direita |
| Curva Lucro | 20mm | Centro |
| Filial | 15mm | Centro |

### 4. Estilos Aplicados

#### Headers de Departamento
- **Nível 3:** Fundo azul (#3B82F6), texto branco, negrito
- **Nível 2:** Fundo azul claro (#C8DCF0), negrito
- **Nível 1:** Fundo cinza (#F0F0F0), negrito

#### Tabela
- **Fonte do cabeçalho:** 8pt, negrito, fundo azul
- **Fonte dos dados:** 7pt
- **Padding:** 1.5mm
- **Margens:** 10mm (esquerda e direita)

## Implementação Técnica

### Função Principal
```typescript
const handleExportarPDF = async () => {
  // 1. Validações
  // 2. Importação dinâmica de jspdf e jspdf-autotable
  // 3. Busca de todos os dados (sem paginação)
  // 4. Criação do documento PDF
  // 5. Formatação do cabeçalho
  // 6. Processamento da hierarquia de dados
  // 7. Geração da tabela
  // 8. Download do arquivo
}
```

### Fluxo de Dados
1. Busca todos os registros da API (page_size: 10000)
2. Itera pela hierarquia: Nível 3 → Nível 2 → Nível 1 → Produtos
3. Insere linhas de cabeçalho para cada nível hierárquico
4. Adiciona produtos com todas as colunas formatadas

### Nome do Arquivo
Formato: `venda-curva-[Filial]-[Mês]-[Ano]-[Data].pdf`

Exemplo: `venda-curva-Filial-101-Setembro-2024-2025-10-17.pdf`

## Como Usar

### Para o Usuário
1. Acesse o relatório "Venda por Curva"
2. Selecione os filtros desejados (Filial, Mês, Ano)
3. Clique no botão "Aplicar" para visualizar os dados
4. Clique no botão "Exportar PDF" no canto superior direito
5. O PDF será gerado e baixado automaticamente

### Botão de Exportação
- **Localização:** Canto superior direito, ao lado do título
- **Ícone:** FileDown (lucide-react)
- **Visibilidade:** Aparece apenas quando há dados para exportar
- **Estados:**
  - Normal: Botão outline com ícone
  - Desabilitado: Durante o carregamento dos dados

## Limitações e Considerações

### 1. Volume de Dados
- A exportação busca até 10.000 registros
- Para datasets muito grandes, considere filtrar por período menor

### 2. Descrição dos Produtos
- Limitada a 40 caracteres no PDF para caber na página
- Produtos com nomes longos serão truncados

### 3. Performance
- Importação dinâmica para não aumentar bundle inicial
- Processamento client-side pode demorar com muitos dados

### 4. Formatação
- Valores monetários: formato brasileiro (R$ X.XXX,XX)
- Percentuais: 2 casas decimais
- Quantidades: 2 casas decimais

## Comparação com Ruptura ABCD

### Semelhanças
- Importação dinâmica de bibliotecas
- Busca de todos os dados sem paginação
- Cabeçalho padronizado
- Rodapé com numeração
- Estrutura de código similar

### Diferenças
| Aspecto | Ruptura ABCD | Venda por Curva |
|---------|--------------|-----------------|
| Orientação | Portrait/Landscape | Landscape |
| Hierarquia | 1 nível (Departamentos) | 3 níveis (Dept 3 → 2 → 1) |
| Colunas | 7-8 colunas | 9 colunas |
| Agrupamento | Por departamento | Por hierarquia completa |
| Tamanho fonte | 8pt | 7pt (mais colunas) |

## Manutenção e Melhorias Futuras

### Possíveis Melhorias
- [ ] Adicionar gráficos de resumo
- [ ] Incluir totalizadores gerais no final
- [ ] Opção de escolher colunas a exportar
- [ ] Exportação em Excel (XLSX)
- [ ] Filtro de curvas específicas
- [ ] Exportação de gráficos visuais
- [ ] Preview antes de baixar
- [ ] Compressão para arquivos grandes

### Bugs Conhecidos
- Nenhum no momento

## Testes Realizados

- [x] Exportação com poucos registros (< 100)
- [x] Exportação com muitos registros (> 500)
- [x] Verificação de hierarquia completa no PDF
- [x] Formatação de valores monetários
- [x] Formatação de percentuais
- [x] Alinhamento das colunas
- [x] Numeração de páginas
- [x] Nome do arquivo gerado
- [x] Build sem erros
- [x] Estados de loading do botão

## Dependências

```json
{
  "jspdf": "^3.0.3",
  "jspdf-autotable": "^5.0.2"
}
```

Ambas já estão instaladas no projeto.

## Arquivos Modificados

### `/src/app/(dashboard)/relatorios/venda-curva/page.tsx`
- Adicionado import do ícone `FileDown`
- Adicionada declaração de módulo para jspdf
- Implementada função `handleExportarPDF`
- Adicionado botão de exportação no header

## Referências

- Implementação base: `/src/app/(dashboard)/relatorios/ruptura-abcd/page.tsx`
- Documentação jsPDF: https://github.com/parallax/jsPDF
- Documentação jspdf-autotable: https://github.com/simonbengtsson/jsPDF-AutoTable

---

**Data de Implementação:** 2025-10-17  
**Status:** ✅ Completo e Testado  
**Build:** ✅ Sem Erros
