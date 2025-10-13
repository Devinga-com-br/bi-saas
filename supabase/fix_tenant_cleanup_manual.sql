-- =====================================================
-- Script Manual: Limpeza de Tenants Inválidos
-- Description: Comandos para executar MANUALMENTE após revisar
-- Author: Sistema BI SaaS
-- Date: 2025-10-12
-- =====================================================
--
-- IMPORTANTE: Execute estes comandos UM POR VEZ e revise os resultados!
--
-- =====================================================

-- ==========================================
-- ETAPA 1: INVESTIGAÇÃO
-- ==========================================

-- 1.1. Ver TODOS os tenants atuais
SELECT
  id,
  name,
  slug,
  cnpj,
  phone,
  tenant_type,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM tenants
ORDER BY created_at DESC;

-- 1.2. Ver tenants INVÁLIDOS (criados automaticamente)
SELECT
  id,
  name,
  slug,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM tenants
WHERE cnpj IS NULL
  AND slug LIKE 'tenant-%'
  AND id NOT IN (
    '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',  -- Okilao Supermercado (manter)
    '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'   -- Paraiso (manter)
  )
ORDER BY created_at DESC;

-- 1.3. Ver usuários vinculados aos tenants inválidos
SELECT
  up.id as user_id,
  up.full_name as usuario,
  up.role,
  up.tenant_id,
  t.name as tenant_invalido
FROM user_profiles up
INNER JOIN tenants t ON t.id = up.tenant_id
WHERE up.tenant_id IN (
  SELECT id FROM tenants
  WHERE cnpj IS NULL
    AND slug LIKE 'tenant-%'
    AND id NOT IN (
      '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',
      '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
    )
)
ORDER BY up.full_name;

-- ==========================================
-- ETAPA 2: REATRIBUIR USUÁRIOS
-- ==========================================

-- 2.1. PREVIEW: Ver quem será afetado
-- Execute ANTES de fazer UPDATE para verificar

-- Usuários que serão movidos para "Paraiso"
SELECT
  up.full_name,
  up.role,
  t.name as tenant_atual,
  'Paraiso' as tenant_novo
FROM user_profiles up
INNER JOIN tenants t ON t.id = up.tenant_id
WHERE up.tenant_id IN (
  '7cf11964-22d9-4a78-a6ff-ab8b82f20e27',  -- paraiso usuario
  '59c1e5ba-930b-479d-af05-f9984a0d7559',  -- paraiso user
  '4b8368be-7d23-4941-881e-ffc71f90d7e7',  -- paraiso admin
  'db6f2fb3-330d-4b2f-b299-c9e938e1ad5b'   -- paraiso admin (duplicado)
);

-- Usuários que serão movidos para "Okilao Supermercado"
SELECT
  up.full_name,
  up.role,
  t.name as tenant_atual,
  'Okilao Supermercado' as tenant_novo
FROM user_profiles up
INNER JOIN tenants t ON t.id = up.tenant_id
WHERE up.tenant_id IN (
  'addac972-cea2-4250-b8ac-a853f429844e'   -- O Kilao Usuario
);

-- Usuários que não sabemos para onde mover (samuel dutra)
SELECT
  up.full_name,
  up.role,
  t.name as tenant_atual,
  '??? DECIDIR' as tenant_novo
FROM user_profiles up
INNER JOIN tenants t ON t.id = up.tenant_id
WHERE up.tenant_id IN (
  'f806015a-5efd-44fa-b43b-9e8ff29d17be'   -- samuel dutra
);

-- 2.2. EXECUTAR UPDATES
-- Descomente e execute UM POR VEZ após revisar

-- Mover usuários relacionados ao "Paraiso" para o tenant correto "Paraiso"
/*
UPDATE user_profiles
SET
  tenant_id = '9402d6f1-3cbd-4a1d-ac24-cd15745be60a',  -- Paraiso (correto)
  updated_at = NOW()
WHERE tenant_id IN (
  '7cf11964-22d9-4a78-a6ff-ab8b82f20e27',  -- paraiso usuario
  '59c1e5ba-930b-479d-af05-f9984a0d7559',  -- paraiso user
  '4b8368be-7d23-4941-881e-ffc71f90d7e7',  -- paraiso admin
  'db6f2fb3-330d-4b2f-b299-c9e938e1ad5b'   -- paraiso admin (duplicado)
);
*/

-- Mover usuários relacionados ao "O Kilao" para o tenant correto "Okilao Supermercado"
/*
UPDATE user_profiles
SET
  tenant_id = '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',  -- Okilao Supermercado (correto)
  updated_at = NOW()
WHERE tenant_id IN (
  'addac972-cea2-4250-b8ac-a853f429844e'   -- O Kilao Usuario
);
*/

-- Decidir o que fazer com "samuel dutra"
-- Opção A: Mover para Paraiso
/*
UPDATE user_profiles
SET
  tenant_id = '9402d6f1-3cbd-4a1d-ac24-cd15745be60a',  -- Paraiso
  updated_at = NOW()
WHERE tenant_id = 'f806015a-5efd-44fa-b43b-9e8ff29d17be';  -- samuel dutra
*/

-- Opção B: Mover para Okilao
/*
UPDATE user_profiles
SET
  tenant_id = '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',  -- Okilao Supermercado
  updated_at = NOW()
WHERE tenant_id = 'f806015a-5efd-44fa-b43b-9e8ff29d17be';  -- samuel dutra
*/

-- Opção C: Tornar superadmin (sem tenant)
/*
UPDATE user_profiles
SET
  tenant_id = NULL,
  role = 'superadmin',
  can_switch_tenants = TRUE,
  updated_at = NOW()
WHERE tenant_id = 'f806015a-5efd-44fa-b43b-9e8ff29d17be';  -- samuel dutra
*/

-- ==========================================
-- ETAPA 3: VERIFICAÇÃO ANTES DE DELETAR
-- ==========================================

-- 3.1. Verificar se ainda há usuários vinculados aos tenants inválidos
-- DEVE retornar 0 linhas se você reatribuiu todos corretamente
SELECT
  COUNT(*) as usuarios_ainda_vinculados,
  't.name' as tenant_name
FROM user_profiles up
INNER JOIN tenants t ON t.id = up.tenant_id
WHERE up.tenant_id IN (
  SELECT id FROM tenants
  WHERE cnpj IS NULL
    AND slug LIKE 'tenant-%'
    AND id NOT IN (
      '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',
      '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
    )
)
GROUP BY t.name;

-- ==========================================
-- ETAPA 4: DELETAR TENANTS INVÁLIDOS
-- ==========================================

-- 4.1. PREVIEW: Quantos registros serão deletados
SELECT
  COUNT(*) as total_a_deletar
FROM tenants
WHERE cnpj IS NULL
  AND slug LIKE 'tenant-%'
  AND id NOT IN (
    '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',
    '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
  );

-- 4.2. PREVIEW: Listar o que será deletado
SELECT
  id,
  name,
  slug,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM tenants
WHERE cnpj IS NULL
  AND slug LIKE 'tenant-%'
  AND id NOT IN (
    '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',
    '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'
  );

-- 4.3. EXECUTAR DELETE
-- ⚠️ ATENÇÃO: Só descomente DEPOIS de:
--    1. Fazer backup
--    2. Verificar que NÃO há usuários vinculados (ETAPA 3.1)
--    3. Revisar a lista do PREVIEW acima
/*
DELETE FROM tenants
WHERE cnpj IS NULL
  AND slug LIKE 'tenant-%'
  AND id NOT IN (
    '030bc3ce-7291-4a70-a1a3-1b8c1c6435e2',  -- Okilao Supermercado (manter)
    '9402d6f1-3cbd-4a1d-ac24-cd15745be60a'   -- Paraiso (manter)
  );
*/

-- ==========================================
-- ETAPA 5: VERIFICAÇÃO FINAL
-- ==========================================

-- 5.1. Ver tenants restantes (devem ser apenas os 2 válidos)
SELECT
  id,
  name,
  slug,
  cnpj,
  phone,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM tenants
ORDER BY created_at DESC;

-- 5.2. Contar usuários por tenant
SELECT
  t.id,
  t.name as tenant_name,
  t.cnpj,
  COUNT(up.id) as total_usuarios
FROM tenants t
LEFT JOIN user_profiles up ON up.tenant_id = t.id
GROUP BY t.id, t.name, t.cnpj
ORDER BY t.name;

-- 5.3. Ver superadmins (devem ter tenant_id = NULL)
SELECT
  id,
  full_name,
  role,
  tenant_id,
  can_switch_tenants
FROM user_profiles
WHERE role = 'superadmin'
ORDER BY full_name;

-- 5.4. Ver usuários sem tenant (exceto superadmins) - NÃO deve ter
SELECT
  id,
  full_name,
  role,
  tenant_id
FROM user_profiles
WHERE tenant_id IS NULL
  AND role != 'superadmin';

-- ==========================================
-- ETAPA 6: ROLLBACK (SE NECESSÁRIO)
-- ==========================================

-- Se algo der errado, você pode restaurar do backup:
/*
-- Restaurar tenants
TRUNCATE TABLE tenants CASCADE;
INSERT INTO tenants SELECT * FROM tenants_backup_20251012;

-- Restaurar user_profiles
TRUNCATE TABLE user_profiles CASCADE;
INSERT INTO user_profiles SELECT * FROM user_profiles_backup_20251012;
*/

-- ==========================================
-- ETAPA 7: LIMPAR BACKUPS (APÓS CONFIRMAR)
-- ==========================================

-- Quando estiver tudo OK, pode deletar os backups:
/*
DROP TABLE IF EXISTS tenants_backup_20251012;
DROP TABLE IF EXISTS user_profiles_backup_20251012;
*/
