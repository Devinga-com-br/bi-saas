# Atualização do Módulo de Metas - Substituição de Períodos

## Resumo das Alterações

Implementada funcionalidade para permitir a **substituição de metas** quando geradas para um período já existente. Agora, ao gerar metas para um mês/ano/filial que já possui metas cadastradas, o sistema irá:

1. **Deletar** todas as metas existentes daquele período e filial
2. **Gerar novas metas** com os parâmetros informados (% meta e data referência)

## Melhorias Implementadas

### 1. Função de Geração Atualizada
- A função `generate_metas_mensais` agora **deleta automaticamente** metas existentes antes de gerar novas
- Não é necessário deletar manualmente as metas antigas
- Processo totalmente transacional e seguro

### 2. Interface Atualizada
- **Aviso visual** no diálogo de cadastro informando sobre a substituição
- Mensagem clara: "Ao gerar metas para um período já cadastrado, as metas anteriores serão substituídas pelos novos valores"

### 3. Listagem Aprimorada - Visualização por Filiais
Quando o filtro **"Todas as Filiais"** está selecionado:

#### Linha Principal (Agregada)
- **Data**: Data do dia
- **Dia da Semana**: Dia correspondente
- **Data Ref.**: Data de referência (primeira filial)
- **Venda Ref.**: Soma de vendas de referência de todas as filiais
- **Meta %**: Média percentual de meta entre as filiais
- **Meta (R$)**: Soma de metas de todas as filiais
- **Realizado**: Soma de vendas realizadas de todas as filiais
- **Diferença**: Diferença total (Realizado - Meta)
- **Dif %**: Percentual de diferença

#### Linhas de Filiais (Expansível)
- **Filial**: Nome/código da filial
- **Dia da Semana**: Dia da semana específico da filial
- **Data Ref.**: Data de referência específica da filial
- **Venda Ref.**: Venda de referência da filial
- **Meta %**: Percentual de meta da filial
- **Meta (R$)**: Meta em reais da filial
- **Realizado**: Venda realizada da filial
- **Diferença**: Diferença da filial
- **Dif %**: Percentual de diferença da filial

> **Nota**: Cada filial pode ter **data de referência diferente** e **% de meta diferente**, pois é possível gerar metas individuais com parâmetros distintos.

## Instruções de Deploy

### 1. Aplicar Migration no Supabase

Execute o arquivo `APPLY_MIGRATION_032.sql` no **SQL Editor** do Supabase:

```sql
-- Copie e cole o conteúdo completo do arquivo APPLY_MIGRATION_032.sql
-- no SQL Editor do Supabase e execute
```

Ou use a linha de comando (se tiver psql instalado):
```bash
psql -h [seu-host-supabase] -U postgres -d postgres < supabase/migrations/032_update_generate_metas_allow_replace.sql
```

### 2. Deploy da Aplicação

```bash
npm run build
npm start
# ou deploy no Vercel/sua plataforma
```

## Como Usar

### Gerando Metas pela Primeira Vez
1. Acesse **Metas > Meta Mensal**
2. Clique em **"Cadastrar Meta"**
3. Preencha:
   - Mês e Ano
   - Filial
   - Meta (%) - Ex: 10 para 10% de crescimento
   - Data de Referência Inicial - Data do ano anterior que será a base
4. Clique em **"Gerar Metas"**

### Substituindo Metas Existentes
1. Siga o mesmo processo acima
2. O sistema irá **detectar automaticamente** se já existem metas
3. As metas antigas serão **substituídas** pelas novas
4. Uma mensagem de sucesso confirmará a operação

## Cenários de Uso

### Cenário 1: Corrigir % de Meta
- **Situação**: Meta foi gerada com 5%, mas deveria ser 10%
- **Solução**: Gere novamente com 10% - as metas antigas serão substituídas

### Cenário 2: Alterar Período de Referência
- **Situação**: Período de referência estava errado (ex: começou dia 15 ao invés de dia 1)
- **Solução**: Gere novamente com a data correta - as metas serão recalculadas

### Cenário 3: Metas Diferentes por Filial
- **Situação**: Filial 1 cresceu 10%, mas Filial 2 deve crescer 15%
- **Solução**: 
  1. Gere meta de 10% para Filial 1
  2. Gere meta de 15% para Filial 2
  3. Na visualização "Todas as Filiais", verá a média entre as filiais

### Cenário 4: Período de Referência Diferente por Filial
- **Situação**: Filial 1 compara com 01/10/2024, mas Filial 2 compara com 15/10/2024
- **Solução**:
  1. Gere meta para Filial 1 com data ref 01/10/2024
  2. Gere meta para Filial 2 com data ref 15/10/2024
  3. Na listagem expansível, cada filial mostrará sua própria data ref e dia da semana

## Validações e Segurança

- ✅ Apenas metas da **mesma filial e período** são deletadas
- ✅ Operação é **transacional** - se falhar, nada é alterado
- ✅ **Multi-tenant**: Cada empresa tem suas metas isoladas
- ✅ **Auditoria**: Geração de metas é registrada nos logs

## Testes Recomendados

1. **Teste Básico**
   - Gerar meta para outubro 2025, filial 1, 10%
   - Verificar se gerou 31 registros (dias do mês)
   
2. **Teste de Substituição**
   - Gerar novamente para mesmo período com 15%
   - Verificar se os valores foram atualizados
   
3. **Teste Multi-Filial**
   - Gerar 10% para filial 1
   - Gerar 15% para filial 2
   - Ver visualização "Todas as Filiais"
   - Expandir dia e ver valores individuais

4. **Teste de Datas de Referência**
   - Gerar filial 1 com ref 01/10/2024
   - Gerar filial 2 com ref 10/10/2024
   - Verificar na listagem expansível que cada filial tem sua data ref

## Estrutura de Dados

```sql
-- Tabela metas_mensais (por schema)
CREATE TABLE schema.metas_mensais (
  id BIGSERIAL PRIMARY KEY,
  filial_id BIGINT NOT NULL,
  data DATE NOT NULL,
  dia_semana TEXT NOT NULL,
  meta_percentual NUMERIC(5,2) NOT NULL,
  data_referencia DATE NOT NULL,
  valor_referencia NUMERIC(15,2) NOT NULL,
  valor_meta NUMERIC(15,2) NOT NULL,
  valor_realizado NUMERIC(15,2) NOT NULL,
  diferenca NUMERIC(15,2) NOT NULL,
  diferenca_percentual NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Erro: "Metas não foram geradas"
- Verifique se a migration 032 foi aplicada
- Verifique se a função `generate_metas_mensais` existe no banco

### Erro: "Dados de referência não encontrados"
- Verifique se existem vendas na tabela `vendas_diarias_por_filial` para as datas de referência
- Ajuste a data de referência inicial para um período com dados

### Listagem não mostra linhas de filial
- Verifique se o filtro está em "Todas as Filiais"
- Clique na seta à esquerda para expandir o dia

## Próximas Melhorias Sugeridas

- [ ] Botão para deletar metas de um período específico
- [ ] Histórico de alterações de metas
- [ ] Visualização comparativa de diferentes cenários de metas
- [ ] Importação em lote de metas via CSV
- [ ] Alertas automáticos quando meta não está sendo atingida

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do sistema
2. Consulte a documentação do Supabase
3. Contate o suporte técnico
