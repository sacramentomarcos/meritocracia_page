# 🧪 GUIA DE TESTES - Sistema de Rotinas e Evidências

## 📝 Casos de Teste

Use este guia para validar o comportamento do sistema em diferentes cenários.

---

## ✅ TESTE 1: Resposta SIM (Sem Criar Pasta)

**Objetivo:** Validar que NENHUMA pasta é criada quando a unidade cumpriu a rotina.

### Dados de Entrada:
```javascript
{
  id_empresa: '002',
  rotina: 'DP - Fechamento do ponto no prazo',
  competencia: '07/2026',
  status: 'SIM',
  justificativa: '',
  arquivos: []
}
```

### Resultado Esperado:
- ❌ Nenhuma pasta criada no Drive
- ✅ Registro adicionado à planilha com status "SIM"
- ✅ Sem URLs de evidências

### Log Esperado:
```
Unidade 002 cumpriu a rotina DP - Fechamento do ponto no prazo. Nenhuma pasta será criada.
```

---

## ⚠️ TESTE 2: Resposta NÃO + SEM Evidências (Sem Criar Pasta)

**Objetivo:** Validar que NENHUMA pasta é criada quando não há evidências.

### Dados de Entrada:
```javascript
{
  id_empresa: '002',
  rotina: 'DP - Fechamento do ponto no prazo',
  competencia: '07/2026',
  status: 'NAO',
  justificativa: 'Atraso na entrega',
  arquivos: []
}
```

### Resultado Esperado:
- ❌ Nenhuma pasta criada no Drive
- ✅ Registro adicionado à planilha com status "NAO"
- ✅ Justificativa registrada
- ❌ Sem URLs de evidências

### Log Esperado:
```
Unidade 002 respondeu NÃO para rotina DP - Fechamento do ponto no prazo mas não anexou evidências. Nenhuma pasta será criada.
```

---

## ✨ TESTE 3: Resposta NÃO + COM Evidências (Criar Pasta)

**Objetivo:** Validar criação completa de estrutura de pastas e upload de arquivos.

### Dados de Entrada:
```javascript
{
  id_empresa: '002',
  rotina: 'FINANCEIRO - Bilhetagem',
  competencia: '07/2026',
  status: 'NAO',
  justificativa: 'Falha no sistema de bilhetagem',
  arquivos: [
    {
      base64Content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      type: 'image/png',
      name: 'screenshot_bilhetagem.png'
    },
    {
      base64Content: 'JVBERi0xLjQKJeLjz9...', // PDF base64 truncado
      type: 'application/pdf',
      name: 'relatorio_bilhetagem.pdf'
    }
  ]
}
```

### Resultado Esperado:
- ✅ Pasta "07/2026" criada em 002-VIÇOSA (ou reutilizada se existir)
- ✅ Pasta "FINANCEIRO" criada dentro de "07/2026"
- ✅ 2 arquivos salvos: screenshot_bilhetagem.png, relatorio_bilhetagem.pdf
- ✅ Registro adicionado à planilha com URLs dos arquivos
- ✅ Estrutura: `002-VIÇOSA/07/2026/FINANCEIRO/[arquivos]`

### Log Esperado:
```
Pasta criada: 07/2026
Pasta criada: FINANCEIRO
✓ Estrutura criada/reutilizada: 002 → 07/2026 → FINANCEIRO (2 arquivos salvos)
```

---

## 🔄 TESTE 4: Reutilização de Pastas (Competência Duplicada)

**Objetivo:** Validar que pastas existentes são reutilizadas.

### Dados de Entrada (1º Envio):
```javascript
{
  id_empresa: '002',
  rotina: 'DP - Fechamento do ponto no prazo',
  competencia: '07/2026',
  status: 'NAO',
  justificativa: 'Evidência 1',
  arquivos: [{ /* arquivo 1 */ }]
}
```

### Dados de Entrada (2º Envio - MESMO competência, OUTRO setor):
```javascript
{
  id_empresa: '002',
  rotina: 'SUPRIMENTOS - Aferição de bomba',
  competencia: '07/2026',  // MESMA competência
  status: 'NAO',
  justificativa: 'Evidência 2',
  arquivos: [{ /* arquivo 2 */ }]
}
```

### Resultado Esperado:
- ✅ 1º envio: Cria pasta "07/2026" → Cria pasta "DP"
- ✅ 2º envio: Reutiliza pasta "07/2026" → Cria pasta "SUPRIMENTOS"
- ✅ Estrutura final: `002-VIÇOSA/07/2026/[DP, SUPRIMENTOS]/`
- ❌ Não deve haver duplicação de pastas

### Log Esperado (2º Envio):
```
Pasta reutilizada: 07/2026
Pasta criada: SUPRIMENTOS
✓ Estrutura criada/reutilizada: 002 → 07/2026 → SUPRIMENTOS (1 arquivo salvos)
```

---

## 🧩 TESTE 5: Múltiplas Unidades + Múltiplas Rotinas

**Objetivo:** Validar processamento de múltiplos registros em um único envio.

### Dados de Entrada:
```javascript
[
  {
    id_empresa: '002',
    rotina: 'DP - Fechamento do ponto no prazo',
    competencia: '07/2026',
    status: 'SIM',
    justificativa: '',
    arquivos: []
  },
  {
    id_empresa: '003',
    rotina: 'FINANCEIRO - Bilhetagem',
    competencia: '07/2026',
    status: 'NAO',
    justificativa: 'Falha',
    arquivos: [{ /* arquivo */ }]
  },
  {
    id_empresa: '004',
    rotina: 'SUPRIMENTOS - Quebra de diesel mensal',
    competencia: '07/2026',
    status: 'NAO',
    justificativa: 'Sem justificativa',
    arquivos: []
  }
]
```

### Resultado Esperado:
- **Unidade 002:** Nenhuma pasta (status SIM)
- **Unidade 003:** Pasta criada (status NAO + com arquivo)
- **Unidade 004:** Nenhuma pasta (status NAO mas sem arquivo)
- ✅ 3 registros na planilha
- ✅ Apenas 1 estrutura de pasta no Drive (para unidade 003)

### Estrutura de Drive Esperada:
```
003-RIO BRANCO/
└── 07/2026/
    └── FINANCEIRO/
        └── [arquivo]
```

---

## 🌐 TESTE 6: Extração Correta de Setores

**Objetivo:** Validar que o setor é extraído corretamente de diferentes rotinas.

### Casos de Teste:

| Rotina | Setor Esperado | ✅/❌ |
|--------|-----------------|-------|
| `DP - Fechamento do ponto no prazo` | `DP` | |
| `FINANCEIRO - Bilhetagem` | `FINANCEIRO` | |
| `SUPRIMENTOS - Aferição de bomba` | `SUPRIMENTOS` | |
| `PATRIMÔNIO - Entrega da movimentação` | `PATRIMÔNIO` | |
| `RH - Realização de entrevistas` | `RH` | |
| `CONTROLADORIA - Envio do Forecast` | `CONTROLADORIA` | |

**Como testar:**

Abra o console do Apps Script (Execução → Logs recentes) e verifique se:

```javascript
console.log(DriveService.extrairSetor('DP - Fechamento do ponto no prazo'));
// Esperado: "DP"

console.log(DriveService.extrairSetor('FINANCEIRO - Bilhetagem'));
// Esperado: "FINANCEIRO"
```

---

## ⚡ TESTE 7: Tratamento de Erros - ID Não Configurado

**Objetivo:** Validar mensagem de erro quando ID não está em `CONFIG.EMPRESAS_DRIVE_IDS`.

### Dados de Entrada:
```javascript
{
  id_empresa: '999',  // ID não configurado
  rotina: 'DP - Fechamento do ponto no prazo',
  competencia: '07/2026',
  status: 'NAO',
  justificativa: 'Teste',
  arquivos: [{ /* arquivo */ }]
}
```

### Resultado Esperado:
- ❌ Erro capturado
- ✅ Log de erro: `ID do Drive não configurado para a empresa 999`
- ✅ Mesmo assim, registro é salvo na planilha (com URLs vazias)
- ❌ Nenhuma pasta criada

### Log Esperado:
```
Erro ao processar rotina para unidade 999: Error: ID do Drive não configurado para a empresa 999. Configure em CONFIG.EMPRESAS_DRIVE_IDS
```

---

## 🔗 TESTE 8: URLs Válidas dos Arquivos

**Objetivo:** Validar que as URLs geradas são válidas e acessíveis.

### Verificação:
1. Após salvar um arquivo, verifique a URL na planilha
2. Formato esperado: `https://drive.google.com/file/d/[FILE_ID]/view`
3. A URL deve ser clicável e abrir o arquivo no Drive

### Exemplo de URL Válida:
```
https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456/view
```

---

## 📋 CHECKLIST DE TESTES

- [ ] **TESTE 1:** Resposta SIM → Sem pasta criada
- [ ] **TESTE 2:** Resposta NÃO + Sem evidências → Sem pasta criada
- [ ] **TESTE 3:** Resposta NÃO + Com evidências → Pasta criada com arquivos
- [ ] **TESTE 4:** Reutilização de pastas (sem duplicação)
- [ ] **TESTE 5:** Múltiplas unidades + Múltiplas rotinas
- [ ] **TESTE 6:** Extração correta de setores
- [ ] **TESTE 7:** Tratamento de erro (ID não configurado)
- [ ] **TESTE 8:** URLs válidas nos registros da planilha

---

## 🚀 EXECUTAR TESTES

### Opção 1: Manualmente via Interface

1. Abra o aplicativo no Google Apps Script
2. Selecione uma rotina e competência
3. Preencha os dados conforme os casos de teste
4. Clique em "Enviar"
5. Verifique Drive e Planilha

### Opção 2: Via Console (Apps Script)

1. Abra o Apps Script Editor
2. Vá para Execução → Novo Editor de Scripts
3. Execute funções de teste:

```javascript
function testeResposta_SIM() {
  const dados = [
    {
      id_empresa: '002',
      rotina: 'DP - Fechamento do ponto no prazo',
      competencia: '07/2026',
      status: 'SIM',
      justificativa: '',
      arquivos: []
    }
  ];
  return salvarRotina(dados);
}

function testeResposta_NAO_SemEvidencias() {
  const dados = [
    {
      id_empresa: '002',
      rotina: 'DP - Fechamento do ponto no prazo',
      competencia: '07/2026',
      status: 'NAO',
      justificativa: 'Teste sem evidências',
      arquivos: []
    }
  ];
  return salvarRotina(dados);
}
```

---

## 📊 Resultado Final Esperado

Após todos os testes:
- ✅ Pastas criadas apenas para NAO + COM evidências
- ✅ Estrutura: Unidade → Competência → Setor
- ✅ Reutilização de pastas (sem duplicação)
- ✅ URLs válidas de arquivos
- ✅ Registros corretos na planilha
- ✅ Tratamento de erros funcional
