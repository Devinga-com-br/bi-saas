# 🧪 Guia de Teste - Troca de Tenant (Empresa)

## 📋 Cenário de Teste

**Objetivo:** Verificar se ao trocar de empresa os dados são recarregados corretamente

---

## 🔍 Como Testar

### 1️⃣ **Preparação**
```bash
npm run dev
```

### 2️⃣ **Login como Superadmin**
- Acesse: http://localhost:3000/login
- Entre com credenciais de superadmin

### 3️⃣ **Abra o Console do Navegador**
Pressione `F12` ou `Cmd+Option+I` (Mac) para ver os logs

### 4️⃣ **Teste - Troca de Empresa no DRE Gerencial**

**Passo a Passo:**

1. **Navegue para DRE Gerencial**
   - URL: `/dre-gerencial`
   - Empresa atual: **Okilao**

2. **Configure Filtros**
   - Selecione algumas filiais
   - Escolha um período
   - Carregue dados

3. **Troque de Empresa**
   - Clique no seletor de empresas (sidebar)
   - Selecione: **Paraiso**

4. **O que deve acontecer:**

   ✅ **Comportamento Esperado:**
   - Overlay de loading aparece: "Trocando empresa..."
   - Console mostra logs:
     ```
     [TenantContext] 🔄 Iniciando troca de tenant: { de: 'Okilao', para: 'Paraiso', ... }
     [TenantContext] ✅ Tenant salvo no localStorage
     [TenantContext] ✅ SessionStorage limpo
     [TenantContext] 🗑️ Removidos X itens do localStorage
     [TenantContext] ✅ Estado atualizado
     [TenantContext] 🔄 RECARREGANDO PÁGINA em 50ms...
     ```
   - **Página recarrega COMPLETAMENTE**
   - DRE Gerencial carrega com dados do **Paraiso**
   - Filtros de filiais mostram apenas filiais do **Paraiso**
   - URL permanece: `/dre-gerencial`

   ❌ **Comportamento ERRADO (bug):**
   - Nada acontece após clicar
   - Filtros de filiais ainda mostram filiais do Okilao
   - Dados não mudam
   - Console não mostra logs

---

## 🐛 Se NÃO funcionar:

### **Debug 1: Verifique o Console**

Procure por:
- **Erro JavaScript?** → Anote o erro e me envie
- **Logs aparecem?** → Me envie os logs
- **Nenhum log?** → A função não está sendo chamada

### **Debug 2: Verifique o LocalStorage**

1. Console → Application → Local Storage
2. Procure: `bi_saas_current_tenant_id`
3. O valor mudou de `okilao_id` para `paraiso_id`?

### **Debug 3: Teste Manual**

No console do navegador, execute:
```javascript
// Ver tenant atual
console.log(localStorage.getItem('bi_saas_current_tenant_id'))

// Forçar reload
window.location.reload()
```

---

## 📝 Resultados do Teste

**Cole aqui os logs do console:**
```
(Cole aqui)
```

**O que aconteceu:**
- [ ] Funcionou perfeitamente ✅
- [ ] Não recarregou ❌
- [ ] Erro no console ❌
- [ ] Outro problema ❌

**Descreva o problema:**
```
(Descreva aqui)
```

---

## 🔧 Troubleshooting Avançado

### **Cenário A: Nenhum log no console**
**Causa:** Função `switchTenant` não está sendo chamada
**Solução:** Verificar se o `onSelect` do CommandItem está correto

### **Cenário B: Logs aparecem mas não recarrega**
**Causa:** `window.location.reload()` sendo bloqueado
**Solução:** 
```typescript
// Testar no console:
window.location.reload()
// Se não funcionar:
window.location.href = window.location.href
```

### **Cenário C: Recarrega mas dados não mudam**
**Causa:** Tenant não foi salvo antes do reload
**Solução:** Aumentar timeout de 50ms para 200ms

---

## ✅ Critérios de Sucesso

- [x] Overlay de loading aparece
- [x] Console mostra 5 logs com emojis
- [x] Página recarrega após 50ms
- [x] Dados do novo tenant aparecem
- [x] Filtros de filiais resetados
- [x] URL mantém `/dre-gerencial`
- [x] Nenhum erro no console

---

**Se todos os critérios passarem: Funcionalidade OK! ✅**
**Se algum falhar: Me envie os logs e descrição do problema! 🐛**
