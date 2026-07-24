# 🎯 RESUMO TÉCNICO - Sistema de Rotinas e Evidências

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (HTML/JS)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Usuário seleciona Competência e Rotina                        │  │
│  │ 2. Formulário carrega com todas as Unidades (EMPRESAS)           │  │
│  │ 3. Para cada Unidade: SIM/NÃO + Justificativa + Evidências      │  │
│  │ 4. Clica "Enviar" → FormBuilder.montarResultados()              │  │
│  │ 5. Api.salvarRotina() chama backend                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────────────────────┘
                  │ Google.script.run.salvarRotina(dados)
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Google Apps Script)                    │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ App.gs::salvarRotina(dados)                                       │  │
│  │ ├─→ RotinaService.salvarRotina(dados)                             │  │
│  │     ├─→ Para CADA item:                                           │  │
│  │     │   ├─ Se status = "SIM" → Registra na planilha, sem pastas  │  │
│  │     │   ├─ Se status = "NAO" + SEM arquivos → Registra, sem pastas
│  │     │   └─ Se status = "NAO" + COM arquivos →                     │  │
│  │     │       └─→ RotinaService.processarCriacaoDePastas()          │  │
│  │     │           ├─ RotinaService.obterPastaUnidade()              │  │
│  │     │           ├─ DriveService.criarOuObterPasta() [Competência] │  │
│  │     │           ├─ DriveService.extrairSetor() [Rotina]           │  │
│  │     │           ├─ DriveService.criarOuObterPasta() [Setor]       │  │
│  │     │           └─ DriveService.salvarArquivos()                   │  │
│  │     └─→ SpreadsheetService.salvarRegistro()                       │  │
│  │         └─ Adiciona linha na planilha com URLs                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────┬──────────────────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
   ┌────────────┐      ┌────────────┐
   │ GOOGLE     │      │ GOOGLE     │
   │ DRIVE      │      │ SHEETS     │
   │            │      │            │
   │ Estrutura: │      │ Registros: │
   │ Unidade →  │      │ • Data     │
   │ Competência│      │ • UUID     │
   │ Setor →    │      │ • Empresa  │
   │ Arquivos   │      │ • Rotina   │
   │            │      │ • Status   │
   │            │      │ • URLs     │
   └────────────┘      └────────────┘
```

---

## 🔀 FLUXO DE DECISÃO

```
┌─────────────────────────────────┐
│ Recebe dados da Unidade         │
│ (status, rotina, arquivos)      │
└────────────┬────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Status = SIM?      │
    └────┬───────────┬───┘
      SIM│           │NÃO
         │           │
         ▼           ▼
    ┌────────────────────────┐
    │ FIM                    │ Tem Arquivos?
    │ (Registra, sem pastas) │
    │                        └────┬────────┬───┐
    └────────────────────────┐   SIM      │   NÃO
                              │           │   │
                              ▼           ▼   ▼
                         ┌──────────────────────────┐
                         │ CRIAR PASTAS             │ FIM
                         │ Unidade → Competência →│ (Registra,
                         │ Setor → Arquivos        │ sem pastas)
                         │                         │
                         │ Retorna URLs            │
                         └──────────────────────────┘
                              │
                              ▼
                         ┌──────────────────────────┐
                         │ Registra na Planilha     │
                         │ com URLs                 │
                         └──────────────────────────┘
```

---

## 🗂️ ESTRUTURA DO DRIVE

### Antes da Implementação:
```
📁 002-VIÇOSA
└── [Sem estrutura de competências]
```

### Depois da Implementação:
```
📁 002-VIÇOSA
├── 📁 06/2026 (outra competência)
│   ├── 📁 DP
│   ├── 📁 FINANCEIRO
│   └── 📁 RH
├── 📁 07/2026 (atual)
│   ├── 📁 DP
│   │   ├── 📄 screenshot_01.png
│   │   ├── 📄 relatorio.pdf
│   │   └── 📄 evidencia.jpg
│   ├── 📁 FINANCEIRO
│   │   ├── 📄 comprovante.xlsx
│   │   └── 📄 nota_fiscal.pdf
│   └── 📁 SUPRIMENTOS
│       └── 📄 nfe.pdf
└── 📁 08/2026 (futura)
```

**Características:**
- ✅ Competências são separadas por pasta
- ✅ Setores são separados dentro da competência
- ✅ Reutiliza pastas existentes (idempotente)
- ✅ Apenas cria quando necessário (NÃO + evidências)

---

## 🔑 FUNÇÕES PRINCIPAIS

### 1. `RotinaService.salvarRotina(dados)`
**Entrada:** Array com dados de rotinas
```javascript
[
  {
    id_empresa: '002',
    rotina: 'DP - Fechamento do ponto',
    competencia: '07/2026',
    status: 'NAO',
    justificativa: 'Problema no sistema',
    arquivos: [{ base64Content, type, name }, ...]
  },
  // ... mais unidades
]
```

**Lógica:**
1. Para cada item, verifica: `status === 'NAO' && arquivos.length > 0`
2. Se verdadeiro → `processarCriacaoDePastas()`
3. Registra na planilha com URLs
4. Retorna resultado

**Saída:**
```javascript
{
  sucesso: true,
  registros: [
    {
      ...item,
      urlsArquivos: ['https://drive.google.com/file/d/...', ...]
    }
  ]
}
```

---

### 2. `RotinaService.processarCriacaoDePastas(item)`
**Sequência de Passos:**

```
item = { id_empresa: '002', rotina: 'FINANCEIRO - Bilhetagem', 
         competencia: '07/2026', arquivos: [...] }

1. obterPastaUnidade('002')
   → Busca em CONFIG.EMPRESAS_DRIVE_IDS['002']
   → DriveApp.getFolderById(DRIVE_ID)
   → Retorna: Pasta 002-VIÇOSA

2. criarOuObterPasta(pastaUnidade, '07/2026')
   → getFoldersByName('07/2026')
   → Se existir: retorna a pasta
   → Se não: createFolder('07/2026')
   → Retorna: Pasta 07/2026

3. extrairSetor('FINANCEIRO - Bilhetagem')
   → Split por ' - '
   → Retorna: 'FINANCEIRO'

4. criarOuObterPasta(pastaCompetencia, 'FINANCEIRO')
   → getFoldersByName('FINANCEIRO')
   → Se existir: retorna
   → Se não: createFolder('FINANCEIRO')
   → Retorna: Pasta FINANCEIRO

5. salvarArquivos(pastaSetor, arquivos)
   → Para cada arquivo:
      - base64Decode()
      - newBlob()
      - createFile()
      - Obter FileID
      - Retornar URL
   → Retorna: ['https://drive.google.com/file/d/...', ...]

RESULTADO:
✓ Estrutura criada: 002-VIÇOSA/07/2026/FINANCEIRO
✓ Arquivos salvos
✓ URLs retornadas
```

---

### 3. `DriveService.criarOuObterPasta(pastaAlvo, nomePasta)`
**Responsabilidade:** Verificar existência antes de criar (evita duplicação)

```javascript
// ENTRADA
pastaAlvo = Pasta(002-VIÇOSA)
nomePasta = "07/2026"

// PROCESSO
1. obterPastaExistente(pastaAlvo, "07/2026")
2. Se encontrou → return pastaExistente
3. Se não → pastaAlvo.createFolder("07/2026")
4. return pastaNovaAliás

// SAÍDA
Pasta(07/2026)
```

**Benefício:** Idempotente - pode ser chamado múltiplas vezes sem criar duplicatas

---

### 4. `DriveService.extrairSetor(rotina)`
**Responsabilidade:** Parsing do formato "SETOR - Nome"

```javascript
// ENTRADA
rotina = "DP - Fechamento do ponto no prazo"

// PROCESSO
1. split(' - ')
   → ["DP", "Fechamento do ponto no prazo"]
2. Pegar primeiro elemento
3. trim()

// SAÍDA
"DP"
```

**Validações:**
- Se rotina for null/undefined → Erro
- Se não tiver " - " → Erro
- Se setor ficar vazio após trim → Erro

---

### 5. `DriveService.salvarArquivos(pasta, arquivos)`
**Responsabilidade:** Converter base64 → Arquivo → URL

```javascript
// ENTRADA
pasta = Pasta(FINANCEIRO)
arquivos = [
  {
    base64Content: "iVBORw0KGgoAAAANSUhEUgAAAA...",
    type: "image/png",
    name: "screenshot.png"
  },
  {
    base64Content: "JVBERi0xLjQK...",
    type: "application/pdf",
    name: "relatorio.pdf"
  }
]

// PROCESSO (para cada arquivo)
1. base64Decode(base64Content)
   → bytes
2. newBlob(bytes, type, name)
   → blob
3. createFile(blob)
   → file
4. getId()
   → fileId
5. Construir URL
   → "https://drive.google.com/file/d/{fileId}/view"

// SAÍDA
[
  "https://drive.google.com/file/d/abc123/view",
  "https://drive.google.com/file/d/def456/view"
]
```

---

## 📊 FLUXO DE DADOS

```
FRONTEND (FormBuilder.montarResultados)
    │
    ▼
[
  { id_empresa, rotina, competencia, status, justificativa, arquivos }
]
    │
    ▼
BACKEND (Api.salvarRotina → salvarRotina)
    │
    ├─→ RotinaService.salvarRotina(dados)
    │   │
    │   ├─→ Para cada item:
    │   │   │
    │   │   ├─ Se SIM: registra sem pastas
    │   │   │
    │   │   ├─ Se NAO sem arquivos: registra sem pastas
    │   │   │
    │   │   └─ Se NAO com arquivos:
    │   │       │
    │   │       ├─→ processarCriacaoDePastas()
    │   │       │   │
    │   │       │   ├─→ obterPastaUnidade() → Pasta Unidade
    │   │       │   ├─→ criarOuObterPasta() → Pasta Competência
    │   │       │   ├─→ extrairSetor() → Nome do Setor
    │   │       │   ├─→ criarOuObterPasta() → Pasta Setor
    │   │       │   └─→ salvarArquivos() → URLsArquivos
    │   │       │
    │   │       └─→ Retorna urlsArquivos
    │   │
    │   └─→ SpreadsheetService.salvarRegistro()
    │       │
    │       ├─→ DATA/HORA
    │       ├─→ UUID
    │       ├─→ ID_EMPRESA
    │       ├─→ ROTINA
    │       ├─→ COMPETÊNCIA
    │       ├─→ STATUS
    │       ├─→ JUSTIFICATIVA
    │       └─→ URLsARQUIVOS
    │
    ├─→ GOOGLE DRIVE
    │   └─ Estrutura criada/reutilizada
    │
    └─→ GOOGLE SHEETS
        └─ Registros adicionados

RESULTADO → Frontend (screenSuccess)
```

---

## 🛡️ VALIDAÇÕES E TRATAMENTOS

### Validação de ID da Empresa
```javascript
if (!CONFIG.EMPRESAS_DRIVE_IDS[idEmpresa]) {
  throw new Error(`ID do Drive não configurado para a empresa ${idEmpresa}`);
}
```

### Validação de Extração de Setor
```javascript
if (!setor) {
  throw new Error(`Não foi possível extrair o setor de: ${rotina}`);
}
```

### Validação de Pasta
```javascript
if (!pastaAlvo || !nomePasta) {
  throw new Error('pastaAlvo e nomePasta são obrigatórios');
}
```

### Try-Catch Global
```javascript
try {
  // Processar
} catch (error) {
  console.error(`Erro ao processar rotina para unidade ${item.id_empresa}:`, error);
  // Mesmo com erro, registra na planilha
  SpreadsheetService.salvarRegistro(item, []);
}
```

---

## 📈 COMPLEXIDADE E PERFORMANCE

### Time Complexity:
- **Processar uma rotina:** O(n) onde n = número de unidades
- **Criar pastas:** O(1) por pasta (Google Drive API)
- **Upload de arquivos:** O(m) onde m = número de arquivos

### Space Complexity:
- **Dados em memória:** O(n) para armazenar resultados
- **Base64:** Temporário durante conversão

### Otimizações:
- ✅ Reutiliza pastas (evita duplicação)
- ✅ Processa em loop (não recursivo)
- ✅ Try-catch não interrompe processamento de outras unidades

---

## 🔐 Segurança

1. **Autenticação:** Usa Google Apps Script Authorization
2. **Permissões:** Requer acesso ao Drive e Sheets
3. **URLs:** Acesso de visualização (read-only)
4. **Auditoria:** UUID para rastreabilidade

---

## 📝 Exemplo de Fluxo Completo

### Input:
```javascript
salvarRotina([
  {
    id_empresa: '002',
    rotina: 'FINANCEIRO - Bilhetagem',
    competencia: '07/2026',
    status: 'NAO',
    justificativa: 'Falha no sistema',
    arquivos: [
      { base64Content: '...png...', type: 'image/png', name: 'print.png' },
      { base64Content: '...pdf...', type: 'application/pdf', name: 'doc.pdf' }
    ]
  }
])
```

### Processamento:
1. ✅ status = 'NAO' + 2 arquivos → processa criação de pastas
2. ✅ obterPastaUnidade('002') → Pasta 002-VIÇOSA
3. ✅ criarOuObterPasta(_, '07/2026') → Pasta 07/2026
4. ✅ extrairSetor('FINANCEIRO - Bilhetagem') → 'FINANCEIRO'
5. ✅ criarOuObterPasta(_, 'FINANCEIRO') → Pasta FINANCEIRO
6. ✅ salvarArquivos(_, [arquivo1, arquivo2]) → [url1, url2]
7. ✅ SpreadsheetService.salvarRegistro(...) → Linha adicionada

### Output:
```javascript
{
  sucesso: true,
  registros: [
    {
      id_empresa: '002',
      rotina: 'FINANCEIRO - Bilhetagem',
      competencia: '07/2026',
      status: 'NAO',
      justificativa: 'Falha no sistema',
      arquivos: [...],
      urlsArquivos: [
        'https://drive.google.com/file/d/abc123/view',
        'https://drive.google.com/file/d/def456/view'
      ]
    }
  ]
}
```

### Resultado no Drive:
```
002-VIÇOSA/
└── 07/2026/
    └── FINANCEIRO/
        ├── print.png
        └── doc.pdf
```

### Resultado na Planilha:
| Data | UUID | Empresa | Rotina | Competência | Status | Justificativa | URLs |
|------|------|---------|--------|------------|--------|---------------|------|
| 2026-07-24 10:30 | abc-123 | 002 | FINANCEIRO - Bilhetagem | 07/2026 | NAO | Falha no sistema | https://... \n https://... |

---

## ✨ Conclusão

O sistema implementa com sucesso:
- ✅ Lógica de decisão baseada em status + evidências
- ✅ Criação automática de estrutura de pastas
- ✅ Reutilização de pastas existentes
- ✅ Upload de múltiplos arquivos
- ✅ Registro centralizado na planilha
- ✅ Tratamento robusto de erros
- ✅ Extração automática de setores
- ✅ URLs compartilháveis dos arquivos
