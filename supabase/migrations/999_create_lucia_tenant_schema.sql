-- =====================================================
-- SCRIPT: Preparar Schema para Novo Tenant "lucia"
-- Data: 2025-10-17
-- Descrição: Cria schema e estrutura básica para tenant
-- =====================================================

-- =====================================================
-- PASSO 1: Criar o Schema
-- =====================================================
CREATE SCHEMA IF NOT EXISTS lucia;

-- =====================================================
-- PASSO 2: Configurar Search Path
-- =====================================================
SET search_path TO lucia, public;

-- =====================================================
-- PASSO 3: Criar Tabelas Básicas
-- =====================================================

-- Tabela de Filiais
CREATE TABLE IF NOT EXISTS filiais (
    id SERIAL PRIMARY KEY,
    codigo INTEGER UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
    id SERIAL PRIMARY KEY,
    codigo INTEGER NOT NULL,
    nome VARCHAR(200) NOT NULL,
    nivel INTEGER NOT NULL, -- 1, 2 ou 3
    parent_id INTEGER REFERENCES departamentos(id),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    codigo INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    departamento_id INTEGER REFERENCES departamentos(id),
    curva_venda CHAR(1), -- A, B, C, D
    curva_lucro CHAR(1), -- A, B, C, D
    preco_venda DECIMAL(10,2),
    estoque_atual DECIMAL(10,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Vendas
CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,
    filial_id INTEGER REFERENCES filiais(id),
    produto_id INTEGER REFERENCES produtos(id),
    data DATE NOT NULL,
    quantidade DECIMAL(10,2) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    valor_lucro DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Setores (para módulo de metas)
CREATE TABLE IF NOT EXISTS setores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    departamento_ids INTEGER[], -- Array de IDs de departamentos
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Metas Mensais
CREATE TABLE IF NOT EXISTS metas_mensais (
    id SERIAL PRIMARY KEY,
    filial_id INTEGER REFERENCES filiais(id),
    data DATE NOT NULL,
    dia_semana VARCHAR(20),
    meta_percentual DECIMAL(5,2) NOT NULL,
    data_referencia DATE,
    valor_referencia DECIMAL(10,2),
    valor_meta DECIMAL(10,2),
    valor_realizado DECIMAL(10,2) DEFAULT 0,
    diferenca DECIMAL(10,2),
    diferenca_percentual DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(filial_id, data)
);

-- Tabela de Metas por Setor
CREATE TABLE IF NOT EXISTS metas_setor (
    id SERIAL PRIMARY KEY,
    setor_id INTEGER REFERENCES setores(id),
    filial_id INTEGER REFERENCES filiais(id),
    data DATE NOT NULL,
    dia_semana VARCHAR(20),
    meta_percentual DECIMAL(5,2) NOT NULL,
    data_referencia DATE,
    valor_referencia DECIMAL(10,2),
    valor_meta DECIMAL(10,2),
    valor_realizado DECIMAL(10,2) DEFAULT 0,
    diferenca DECIMAL(10,2),
    diferenca_percentual DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(setor_id, filial_id, data)
);

-- =====================================================
-- PASSO 4: Criar Índices para Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data);
CREATE INDEX IF NOT EXISTS idx_vendas_filial ON vendas(filial_id);
CREATE INDEX IF NOT EXISTS idx_vendas_produto ON vendas(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_departamento ON produtos(departamento_id);
CREATE INDEX IF NOT EXISTS idx_departamentos_nivel ON departamentos(nivel);
CREATE INDEX IF NOT EXISTS idx_metas_mensais_filial_data ON metas_mensais(filial_id, data);
CREATE INDEX IF NOT EXISTS idx_metas_setor_filial_data ON metas_setor(filial_id, data);

-- =====================================================
-- PASSO 5: Configurar Permissões
-- =====================================================

-- Permissões para o role anon (usuários não autenticados)
GRANT USAGE ON SCHEMA lucia TO anon;

-- Permissões para o role authenticated (usuários autenticados)
GRANT USAGE ON SCHEMA lucia TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA lucia TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA lucia TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA lucia TO authenticated;

-- Permissões para o role service_role (backend)
GRANT USAGE ON SCHEMA lucia TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA lucia TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA lucia TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA lucia TO service_role;

-- =====================================================
-- PASSO 6: Criar Funções RPC Necessárias
-- =====================================================

-- Função para relatório de Venda por Curva
-- (Copiar a função completa do arquivo de migration existente)
-- Exemplo simplificado:
CREATE OR REPLACE FUNCTION get_venda_curva_report(
    p_schema TEXT,
    p_mes INTEGER,
    p_ano INTEGER,
    p_filial_id INTEGER,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
    dept_nivel3 TEXT,
    dept_nivel2 TEXT,
    dept_nivel1 TEXT,
    produto_codigo INTEGER,
    produto_descricao TEXT,
    filial_id INTEGER,
    qtde NUMERIC,
    valor_vendas NUMERIC,
    valor_lucro NUMERIC,
    percentual_lucro NUMERIC,
    curva_venda TEXT,
    curva_lucro TEXT
) AS $$
BEGIN
    -- Implementação da função
    -- (Copiar do arquivo de migration existente)
    RETURN QUERY
    SELECT 
        d3.nome::TEXT as dept_nivel3,
        d2.nome::TEXT as dept_nivel2,
        d1.nome::TEXT as dept_nivel1,
        p.codigo as produto_codigo,
        p.descricao as produto_descricao,
        v.filial_id,
        SUM(v.quantidade) as qtde,
        SUM(v.valor_total) as valor_vendas,
        SUM(v.valor_lucro) as valor_lucro,
        CASE 
            WHEN SUM(v.valor_total) > 0 THEN (SUM(v.valor_lucro) / SUM(v.valor_total) * 100)
            ELSE 0
        END as percentual_lucro,
        p.curva_venda::TEXT,
        p.curva_lucro::TEXT
    FROM vendas v
    JOIN produtos p ON v.produto_id = p.id
    JOIN departamentos d1 ON p.departamento_id = d1.id
    LEFT JOIN departamentos d2 ON d1.parent_id = d2.id
    LEFT JOIN departamentos d3 ON d2.parent_id = d3.id
    WHERE EXTRACT(MONTH FROM v.data) = p_mes
      AND EXTRACT(YEAR FROM v.data) = p_ano
      AND v.filial_id = p_filial_id
    GROUP BY d3.nome, d2.nome, d1.nome, p.codigo, p.descricao, v.filial_id, p.curva_venda, p.curva_lucro
    ORDER BY SUM(v.valor_total) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para relatório de Ruptura ABCD
-- (Copiar do arquivo de migration existente)

-- =====================================================
-- PASSO 7: Registrar Tenant na Tabela Principal
-- =====================================================

-- Voltar para o schema public
SET search_path TO public;

-- Inserir registro do tenant
INSERT INTO tenants (name, supabase_schema, created_at)
VALUES ('Lucia', 'lucia', NOW())
ON CONFLICT (supabase_schema) DO NOTHING;

-- =====================================================
-- PASSO 8: Verificações
-- =====================================================

-- Verificar que o schema foi criado
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'lucia';

-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'lucia';

-- Verificar tenant registrado
SELECT id, name, supabase_schema 
FROM public.tenants 
WHERE supabase_schema = 'lucia';

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
APÓS EXECUTAR ESTE SCRIPT:

1. ✅ Schema 'lucia' criado
2. ✅ Tabelas básicas criadas
3. ✅ Índices criados
4. ✅ Permissões configuradas
5. ✅ Tenant registrado

PRÓXIMOS PASSOS OBRIGATÓRIOS:

1. ⚠️ ADICIONAR 'lucia' AOS EXPOSED SCHEMAS NO SUPABASE DASHBOARD
   - Ir em Settings → API
   - Adicionar 'lucia' à lista de "Exposed schemas"
   - Exemplo: "public, graphql_public, okilao, saoluiz, paraiso, lucia"

2. Importar dados iniciais:
   - Filiais
   - Departamentos
   - Produtos
   - Vendas históricas

3. Criar funções RPC completas:
   - get_venda_curva_report
   - get_ruptura_abcd_report
   - get_metas_report
   - etc.

4. Testar acesso via API:
   - GET /api/setores?schema=lucia
   - GET /api/branches?tenant_id=<tenant_id>
   - etc.

5. Criar usuários do tenant:
   - Inserir na tabela user_profiles com tenant_id correto

DOCUMENTAÇÃO COMPLETA:
Ver arquivo: docs/SUPABASE_SCHEMA_CONFIGURATION.md
*/
