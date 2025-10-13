# 🔧 Troubleshooting Guide

Guia de resolução de problemas comuns no projeto BI SaaS.

---

## 🚨 Erros Comuns

### 1. Erros de Build - ENOENT no `.next`

**Sintoma:**
```
Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp.*'
```

**Causa:** Cache corrompido do Next.js/Turbopack durante hot reload.

**Solução:**

**Opção 1 - Script npm:**
```bash
npm run clean
npm run dev
```

**Opção 2 - Script shell:**
```bash
./scripts/clean-cache.sh
npm run dev
```

**Opção 3 - Manual:**
```bash
rm -rf .next node_modules/.cache
npm run dev
```

---

### 2. TypeScript Errors em Supabase Queries

**Sintoma:**
```
Type error: No overload matches this call
```

**Causa:** Tipos do Supabase às vezes não inferem corretamente.

**Solução:**
Use type assertion com `as any` e eslint-disable:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await supabase
  .from('table')
  .operation({ ...data } as any)
```

---

### 3. Chart.js não Renderiza / CategoryScale Error

**Sintoma:**
- Gráfico não aparece
- Console mostra: `"category" is not a registered scale`
- Erro: `"linear" is not a registered scale`

**Causa:** Elementos do Chart.js não registrados antes do componente renderizar.

**Solução:**
Os elementos do Chart.js são registrados automaticamente ao importar qualquer opção de configuração de `@/lib/chart-config`. Use sempre os wrappers fornecidos:

```typescript
// ✅ Correto - Registro automático
import { AreaChart } from '@/components/charts/area-chart'
import { LineChart } from '@/components/charts/line-chart'
import { BarChart } from '@/components/charts/bar-chart'

// ❌ Incorreto - Requer registro manual
import { Line } from 'react-chartjs-2'
```

**Como funciona:**
- O arquivo `src/lib/chart-config.ts` registra todos os elementos na primeira importação (module-level side effect)
- Os wrappers importam automaticamente a configuração, garantindo o registro
- Não é necessário chamar `registerChartJS()` manualmente

**Se ainda não funcionar:**
1. Limpar cache: `npm run clean`
2. Restart servidor: `npm run dev`
3. Hard refresh no browser: `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows)

---

### 4. RLS Policy Errors - Infinite Recursion

**Sintoma:**
```
infinite recursion detected in policy for relation "user_profiles"
```

**Causa:** Policy RLS fazendo query na mesma tabela que está protegendo.

**Solução:**
No Supabase Dashboard → Authentication → Policies:

```sql
-- Política simples que NÃO causa recursão
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);
```

**Evitar:**
```sql
-- ❌ Isso causa recursão
USING (
  id IN (
    SELECT id FROM user_profiles WHERE tenant_id = ...
  )
);
```

---

### 5. Hot Reload Não Funciona

**Sintoma:** Mudanças no código não refletem no browser.

**Soluções:**

**1. Hard Refresh:**
- Chrome/Edge: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5`

**2. Limpar Cache:**
```bash
npm run clean
npm run dev
```

**3. Restart Completo:**
```bash
# Parar servidor (Ctrl+C)
npm run clean
npm run dev
```

---

### 6. Porta 3000 em Uso

**Sintoma:**
```
Port 3000 is in use, using available port 3002 instead
```

**Causa:** Outro processo usando a porta 3000.

**Soluções:**

**Opção 1 - Usar porta alternativa:**
```bash
# Next.js automaticamente usa próxima porta disponível
npm run dev
# Acessar em: http://localhost:3002
```

**Opção 2 - Matar processo na porta 3000:**
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### 7. Supabase Connection Errors

**Sintoma:**
```
Error: Invalid API key
```
ou
```
Error: Failed to fetch
```

**Causa:** Variáveis de ambiente não configuradas ou incorretas.

**Solução:**

1. Verificar `.env.local`:
```bash
# Deve conter:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Restart após alterar `.env.local`:
```bash
# Sempre reiniciar servidor após mudar .env
npm run dev
```

3. Verificar no Supabase Dashboard:
   - Project Settings → API
   - Copiar URL e anon key corretos

---

### 8. shadcn/ui Component Errors

**Sintoma:**
```
Module not found: Can't resolve '@/components/ui/...'
```

**Causa:** Componente shadcn/ui não instalado.

**Solução:**
```bash
npx shadcn@latest add [component-name]

# Exemplo:
npx shadcn@latest add button
```

**Componentes instalados:**
- alert, avatar, badge, button, card, collapsible
- dropdown-menu, input, label, progress, select
- separator, sheet, sidebar, skeleton, tabs, tooltip

---

## 🔄 Scripts de Manutenção

### Limpar Cache
```bash
npm run clean
```
Remove `.next` e `node_modules/.cache`

### Limpar Tudo e Reinstalar
```bash
npm run clean:all
```
Remove `.next`, `node_modules`, `package-lock.json` e reinstala tudo.

**⚠️ Atenção:** `clean:all` demora mais (~2-3 minutos).

### Build de Produção
```bash
npm run build
npm start
```

### Verificar Lint
```bash
npm run lint
```

---

## 📊 Chart.js Specific Issues

### Gráfico não Atualiza

**Solução:** Use `useMemo` para dados:
```typescript
const chartData = useMemo(() => ({
  labels: [...],
  datasets: [...]
}), [dependencies])
```

### Tooltip Não Formata Corretamente

**Solução:** Use callbacks customizados:
```typescript
import { formatCurrency } from '@/lib/chart-config'

options: {
  plugins: {
    tooltip: {
      callbacks: {
        label: (context) => formatCurrency(context.parsed.y)
      }
    }
  }
}
```

### Cores Não Seguem Design System

**Solução:** Sempre use `chartColorsRGBA`:
```typescript
import { chartColorsRGBA } from '@/lib/chart-config'

// ✅ Correto
backgroundColor: chartColorsRGBA.primary

// ❌ Incorreto
backgroundColor: '#3B82F6'
```

---

## 🆘 Quando Nada Funciona

### Reset Completo

```bash
# 1. Parar servidor
# Ctrl+C

# 2. Limpar TUDO
rm -rf .next node_modules package-lock.json

# 3. Reinstalar
npm install

# 4. Limpar cache do npm (opcional)
npm cache clean --force

# 5. Restart
npm run dev
```

### Verificar Versões

```bash
node --version   # Deve ser >= 18
npm --version    # Deve ser >= 9

# Versões esperadas:
# Node: 20.x ou 22.x
# npm: 9.x ou 10.x
```

---

## 📞 Suporte

### Documentação
- [CLAUDE.md](CLAUDE.md) - Guia principal
- [CHARTS_GUIDE.md](CHARTS_GUIDE.md) - Guia de gráficos
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Status do projeto

### Links Externos
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Chart.js Docs](https://www.chartjs.org/docs/latest/)
- [shadcn/ui Docs](https://ui.shadcn.com)

---

## ✅ Checklist de Debug

Quando tiver um problema:

- [ ] Li a mensagem de erro completa
- [ ] Verifiquei se `.env.local` está configurado
- [ ] Tentei `npm run clean && npm run dev`
- [ ] Verifiquei a documentação (CLAUDE.md)
- [ ] Procurei erro similar neste guia
- [ ] Tentei hard refresh no browser
- [ ] Verifiquei console do browser (F12)
- [ ] Verifiquei logs do terminal

Se ainda não funcionar, considere reset completo.

---

**Última atualização:** 11 de Outubro de 2025
