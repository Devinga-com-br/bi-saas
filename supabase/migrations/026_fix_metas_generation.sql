-- Migration: Fix metas generation logic
-- Description: Fix the date calculation to properly generate metas for the selected month only

CREATE OR REPLACE FUNCTION public.generate_metas_mensais(
  p_schema text,
  p_filial_id bigint,
  p_mes integer,
  p_ano integer,
  p_meta_percentual numeric,
  p_data_referencia_inicial date
)
RETURNS jsonb AS $$
DECLARE
  v_data date;
  v_data_referencia date;
  v_dia_semana text;
  v_valor_referencia numeric(15, 2);
  v_valor_meta numeric(15, 2);
  v_valor_realizado numeric(15, 2);
  v_diferenca numeric(15, 2);
  v_diferenca_percentual numeric(5, 2);
  v_dias_processados integer := 0;
  v_dias_no_mes integer;
BEGIN
  -- Validar parâmetros
  IF p_mes < 1 OR p_mes > 12 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mês inválido');
  END IF;
  
  IF p_ano < 2000 OR p_ano > 2100 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ano inválido');
  END IF;
  
  -- Calcular quantos dias tem o mês
  v_dias_no_mes := EXTRACT(DAY FROM (make_date(p_ano, p_mes, 1) + interval '1 month' - interval '1 day'));
  
  -- Iniciar no primeiro dia do mês escolhido
  v_data := make_date(p_ano, p_mes, 1);
  v_data_referencia := p_data_referencia_inicial;
  
  -- Loop pelos dias do mês
  FOR i IN 1..v_dias_no_mes LOOP
    -- Obter dia da semana em português
    v_dia_semana := CASE EXTRACT(DOW FROM v_data)
      WHEN 0 THEN 'Domingo'
      WHEN 1 THEN 'Segunda-Feira'
      WHEN 2 THEN 'Terça-Feira'
      WHEN 3 THEN 'Quarta-Feira'
      WHEN 4 THEN 'Quinta-Feira'
      WHEN 5 THEN 'Sexta-Feira'
      WHEN 6 THEN 'Sábado'
    END;
    
    -- Buscar valor de referência do ano anterior
    EXECUTE format('
      SELECT COALESCE(valor_total, 0)
      FROM %I.vendas_diarias_por_filial
      WHERE filial_id = $1 AND data_venda = $2
    ', p_schema)
    INTO v_valor_referencia
    USING p_filial_id, v_data_referencia;
    
    -- Calcular valor meta
    v_valor_meta := v_valor_referencia * (1 + (p_meta_percentual / 100));
    
    -- Buscar valor realizado
    EXECUTE format('
      SELECT COALESCE(valor_total, 0)
      FROM %I.vendas_diarias_por_filial
      WHERE filial_id = $1 AND data_venda = $2
    ', p_schema)
    INTO v_valor_realizado
    USING p_filial_id, v_data;
    
    -- Calcular diferença
    v_diferenca := v_valor_realizado - v_valor_meta;
    
    -- Calcular diferença percentual
    IF v_valor_meta > 0 THEN
      v_diferenca_percentual := (v_diferenca / v_valor_meta) * 100;
    ELSE
      v_diferenca_percentual := 0;
    END IF;
    
    -- Inserir ou atualizar meta
    EXECUTE format('
      INSERT INTO %I.metas_mensais (
        filial_id, data, dia_semana, meta_percentual, data_referencia,
        valor_referencia, valor_meta, valor_realizado, diferenca,
        diferenca_percentual
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (filial_id, data)
      DO UPDATE SET
        dia_semana = EXCLUDED.dia_semana,
        meta_percentual = EXCLUDED.meta_percentual,
        data_referencia = EXCLUDED.data_referencia,
        valor_referencia = EXCLUDED.valor_referencia,
        valor_meta = EXCLUDED.valor_meta,
        valor_realizado = EXCLUDED.valor_realizado,
        diferenca = EXCLUDED.diferenca,
        diferenca_percentual = EXCLUDED.diferenca_percentual,
        updated_at = now()
    ', p_schema)
    USING p_filial_id, v_data, v_dia_semana, p_meta_percentual, v_data_referencia,
          v_valor_referencia, v_valor_meta, v_valor_realizado, v_diferenca,
          v_diferenca_percentual;
    
    v_dias_processados := v_dias_processados + 1;
    
    -- Avançar para o próximo dia
    v_data := v_data + interval '1 day';
    v_data_referencia := v_data_referencia + interval '1 day';
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Metas geradas com sucesso para %s/%s', p_mes, p_ano),
    'dias_processados', v_dias_processados
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
