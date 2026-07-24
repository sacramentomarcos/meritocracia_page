function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Meritocracia - Envio das rotinas');
}

function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}

function salvarRotina(dados) {
  return RotinaService.salvarRotina(dados);
}

const DriveService = {
  obterPasta: (folderId) => {
    const pasta = DriveApp.getFolderById(folderId);

    if (!pasta) {
      throw new Error(`Não foi possível localizar a pasta do Drive com o ID configurado: ${folderId}`);
    }

    return pasta;
  },

  /**
   * Verifica se uma pasta com o nome especificado existe dentro da pasta pai
   * @param {Folder} pastaAlvo - Pasta pai
   * @param {string} nomePasta - Nome da pasta a procurar
   * @returns {Folder|null} Pasta encontrada ou null
   */
  obterPastaExistente: (pastaAlvo, nomePasta) => {
    try {
      const folders = pastaAlvo.getFoldersByName(nomePasta);
      if (folders.hasNext()) {
        return folders.next();
      }
    } catch (error) {
      console.error(`Erro ao procurar pasta '${nomePasta}':`, error);
    }
    return null;
  },

  /**
   * Cria ou obtém uma pasta dentro de outra pasta
   * @param {Folder} pastaAlvo - Pasta pai
   * @param {string} nomePasta - Nome da pasta a criar/obter
   * @returns {Folder} Pasta criada ou existente
   */
  criarOuObterPasta: (pastaAlvo, nomePasta) => {
    if (!pastaAlvo || !nomePasta) {
      throw new Error('pastaAlvo e nomePasta são obrigatórios');
    }

    const pastaExistente = DriveService.obterPastaExistente(pastaAlvo, nomePasta);
    if (pastaExistente) {
      console.log(`Pasta reutilizada: ${nomePasta}`);
      return pastaExistente;
    }

    const pastaNovaAliás = pastaAlvo.createFolder(nomePasta);
    console.log(`Pasta criada: ${nomePasta}`);
    return pastaNovaAliás;
  },

  /**
   * Extrai o setor de uma rotina (texto antes do " - ")
   * Exemplo: "DP - Fechamento do ponto" → "DP"
   * @param {string} rotina - Nome da rotina
   * @returns {string} Setor extraído
   */
  extrairSetor: (rotina) => {
    if (!rotina || typeof rotina !== 'string') {
      throw new Error('Rotina inválida');
    }

    const partes = rotina.split(' - ');
    const setor = partes[0].trim();

    if (!setor) {
      throw new Error(`Não foi possível extrair o setor de: ${rotina}`);
    }

    return setor;
  },

  /**
   * Salva arquivos em uma pasta específica
   * @param {Folder} pasta - Pasta destino
   * @param {Array} arquivos - Array de objetos com base64Content, type, name
   * @returns {Array} Array com URLs dos arquivos salvos
   */
  salvarArquivos: (pasta, arquivos) => {
    if (!Array.isArray(arquivos) || !arquivos.length) {
      return [];
    }

    return arquivos.map((arq) => {
      try {
        const bytes = Utilities.base64Decode(arq?.base64Content || '');
        const blob = Utilities.newBlob(
          bytes,
          arq?.type || 'application/octet-stream',
          arq?.name || `arquivo_${Date.now()}`
        );

        const arquivoCriado = pasta.createFile(blob);
        const fileId = arquivoCriado.getId();

        return `https://drive.google.com/file/d/${fileId}/view`;
      } catch (error) {
        console.error('Erro ao salvar arquivo no Drive:', error);
        return '';
      }
    });
  },
};

const RotinaService = {
  /**
   * Processa dados de rotinas com lógica de criação de pastas
   * Regra: Apenas criar pastas se houver resposta NEGATIVA + evidências anexadas
   * @param {Array} dados - Array de objetos com dados das rotinas
   * @returns {Object} Resultado do processamento
   */
  salvarRotina: (dados) => {
    if (!Array.isArray(dados)) {
      throw new Error('Dados inválidos para salvarRotina');
    }

    // Agrupamos os dados por unidade para processar a lógica corretamente
    const resultadosProcessados = [];

    dados.forEach((item) => {
      try {
        const podecriarPastade = item.status === 'NAO' && item.arquivos && item.arquivos.length > 0;

        let urlsArquivos = [];

        if (podecriarPastade) {
          // Lógica de criação de pastas APENAS se houver negativa com evidências
          urlsArquivos = RotinaService.processarCriacaoDePastas(item);
        } else if (item.status === 'NAO' && (!item.arquivos || item.arquivos.length === 0)) {
          // Se for negativa mas SEM evidências, apenas registra na planilha
          console.warn(
            `Unidade ${item.id_empresa} respondeu NÃO para rotina ${item.rotina} mas não anexou evidências. Nenhuma pasta será criada.`
          );
        } else if (item.status === 'SIM') {
          // Se for positiva, nenhuma pasta é criada
          console.log(`Unidade ${item.id_empresa} cumpriu a rotina ${item.rotina}. Nenhuma pasta será criada.`);
        }

        // Sempre registra na planilha, independentemente de criar pastas ou não
        SpreadsheetService.salvarRegistro(item, urlsArquivos);
        resultadosProcessados.push({ ...item, urlsArquivos });
      } catch (error) {
        console.error(`Erro ao processar rotina para unidade ${item.id_empresa}:`, error);
        // Mesmo com erro, tenta registrar na planilha
        SpreadsheetService.salvarRegistro(item, []);
      }
    });

    return { sucesso: true, registros: resultadosProcessados };
  },

  /**
   * Processa a criação de pastas e upload de arquivos
   * Estrutura: Unidade → Competência → Setor → Arquivos
   * @param {Object} item - Dados da rotina
   * @returns {Array} URLs dos arquivos salvos
   */
  processarCriacaoDePastas: (item) => {
    // 1. Obter pasta da unidade
    const pastaUnidade = RotinaService.obterPastaUnidade(item.id_empresa);

    // 2. Criar ou obter pasta da competência dentro da pasta da unidade
    const pastaCompetencia = DriveService.criarOuObterPasta(pastaUnidade, item.competencia);

    // 3. Extrair setor da rotina
    const setor = DriveService.extrairSetor(item.rotina);

    // 4. Criar ou obter pasta do setor dentro da pasta da competência
    const pastaSetor = DriveService.criarOuObterPasta(pastaCompetencia, setor);

    // 5. Salvar arquivos dentro da pasta do setor
    const urlsArquivos = DriveService.salvarArquivos(pastaSetor, item.arquivos || []);

    console.log(
      `✓ Estrutura criada/reutilizada: ${item.id_empresa} → ${item.competencia} → ${setor} (${urlsArquivos.length} arquivos salvos)`
    );

    return urlsArquivos;
  },

  /**
   * Obtém a pasta da unidade usando o CONFIG.EMPRESAS_DRIVE_IDS
   * @param {string} idEmpresa - ID da empresa (ex: "002")
   * @returns {Folder} Pasta da unidade
   */
  obterPastaUnidade: (idEmpresa) => {
    if (!CONFIG.EMPRESAS_DRIVE_IDS || !CONFIG.EMPRESAS_DRIVE_IDS[idEmpresa]) {
      throw new Error(
        `ID do Drive não configurado para a empresa ${idEmpresa}. Configure em CONFIG.EMPRESAS_DRIVE_IDS`
      );
    }

    const folderId = CONFIG.EMPRESAS_DRIVE_IDS[idEmpresa];
    return DriveService.obterPasta(folderId);
  },
};

const SpreadsheetService = {
  obterPlanilha: () => {
    try {
      if (CONFIG.SPREADSHEET_ID) {
        return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      }
    } catch (error) {
      console.warn('Não foi possível abrir a planilha pelo ID. Tentando pela URL.', error);
    }

    if (CONFIG.SPREADSHEET_URL) {
      try {
        return SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
      } catch (error) {
        console.warn('Não foi possível abrir a planilha pela URL.', error);
      }
    }

    return SpreadsheetApp.getActiveSpreadsheet();
  },

  salvarRegistro: (item, urlsArquivos) => {
    const ss = SpreadsheetService.obterPlanilha();
    const planilha = ss.getActiveSheet();

    const agora = new Date();
    const urlsValidas = (urlsArquivos || []).filter(Boolean);

    planilha.appendRow([
      agora,
      Utilities.getUuid(),
      item.id_empresa,
      //item.idrotina,
      8,
      item.rotina,
      item.competencia || '',
      item.status,
      item.justificativa,
      urlsValidas.join('\n')
    ]); 
  }
};

const Utils = {
  gerarAliasArquivo: (file, index) => {
    const nomeArquivo = file.name || `arquivo_${index + 1}`;
    if (!file.name || file.name === 'image.png') {
      return `print_${Date.now()}_${index + 1}.png`;
    }

    return nomeArquivo;
  },
};

const ValidationService = {
  validarCampos: (dados) => {
    if (!dados || !Array.isArray(dados)) {
      throw new Error('Dados inválidos');
    }
    return true;
  },
};

const CONFIG = {
  // ID da pasta raiz do projeto (se necessário para outros fins)
  DRIVE_FOLDER_ID: '1tb9tcnmpeNm2NHZLBcOOYMy8ldksppKg',
  
  // ID da planilha para registrar os resultados
  SPREADSHEET_ID: '1eAMoLMG415cqMo_pWwIcieaKAjJ0Sew-rHiGAIZvfh0',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1eAMoLMG415cqMo_pWwIcieaKAjJ0Sew-rHiGAIZvfh0',

  /**
   * Mapear cada unidade com seu ID no Google Drive
   * Formato: { 'ID_EMPRESA': 'FOLDER_ID_NO_DRIVE' }
   * 
   * TODO: Preencer com os IDs reais do Drive de cada unidade
   * Exemplo: '002': '1aBcDeFgHiJkLmNoPqRsTuVwXyZ...'
   */
  EMPRESAS_DRIVE_IDS: {
    '002': 'TODO_ADICIONAR_ID_DRIVE_VIÇOSA',
    '003': 'TODO_ADICIONAR_ID_DRIVE_RIO_BRANCO',
    '004': 'TODO_ADICIONAR_ID_DRIVE_UBA',
    '005': 'TODO_ADICIONAR_ID_DRIVE_ITAPETINGA',
    '009': 'TODO_ADICIONAR_ID_DRIVE_SV_ITABIRITO',
    '011': 'TODO_ADICIONAR_ID_DRIVE_TRES_FRONTEIRAS',
    '012': 'TODO_ADICIONAR_ID_DRIVE_PLANALTO',
    '015': 'TODO_ADICIONAR_ID_DRIVE_SV_ITABIRA',
    '022': 'TODO_ADICIONAR_ID_DRIVE_SV_LAFAIETE',
    '027': 'TODO_ADICIONAR_ID_DRIVE_ANSAL',
    '030': 'TODO_ADICIONAR_ID_DRIVE_UNAI',
    '034': 'TODO_ADICIONAR_ID_DRIVE_ALTO_HORIZONTE',
    '035': 'TODO_ADICIONAR_ID_DRIVE_POUSO_ALEGRE',
    '038': 'TODO_ADICIONAR_ID_DRIVE_CURVELO',
    '046': 'TODO_ADICIONAR_ID_DRIVE_QUATAI',
    '049': 'TODO_ADICIONAR_ID_DRIVE_SV_ITAGUAI',
    '055': 'TODO_ADICIONAR_ID_DRIVE_TRANSPORTE_SERGIPE',
    '059': 'TODO_ADICIONAR_ID_DRIVE_JATAÍ',
    '062': 'TODO_ADICIONAR_ID_DRIVE_VAZANTE',
    '063': 'TODO_ADICIONAR_ID_DRIVE_TRES_MARIAS',
    '064': 'TODO_ADICIONAR_ID_DRIVE_MINEIROS',
    '067': 'TODO_ADICIONAR_ID_DRIVE_JACOBINA',
    '074': 'TODO_ADICIONAR_ID_DRIVE_DOURADOS',
    '075': 'TODO_ADICIONAR_ID_DRIVE_CORINTO',
    '080': 'TODO_ADICIONAR_ID_DRIVE_RIO_VERDE',
    '084': 'TODO_ADICIONAR_ID_DRIVE_MINAÇU',
    '085': 'TODO_ADICIONAR_ID_DRIVE_RESENDE',
    '089': 'TODO_ADICIONAR_ID_DRIVE_CRIXAS',
    '098': 'TODO_ADICIONAR_ID_DRIVE_PARAIBA_DO_SUL',
  },
};

