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

function validarRotinaNaCompetencia(dados) {
  return RotinaService.validarRotinaNaCompetencia(dados);
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
      Logger.log(`Pasta reutilizada: ${nomePasta}`);
      return pastaExistente;
    }

    const pastaNovaAliás = pastaAlvo.createFolder(nomePasta);
    Logger.log(`Pasta criada: ${nomePasta}`);
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

function normalizarNomeCampo(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function obterEmailUsuario() {
  try {
    const emailAtivo = Session.getActiveUser().getEmail();
    if (emailAtivo) {
      return emailAtivo;
    }
  } catch (error) {
    console.warn('Não foi possível obter o e-mail via Session.getActiveUser():', error);
  }

  try {
    const emailEfetivo = Session.getEffectiveUser().getEmail();
    if (emailEfetivo) {
      return emailEfetivo;
    }
  } catch (error) {
    console.warn('Não foi possível obter o e-mail via Session.getEffectiveUser():', error);
  }

  return '';
}

function obterValorCampo(item, nome) {
  if (!item || typeof item !== 'object') {
    return '';
  }

  const chaves = Object.keys(item || {});
  const mapaNormalizado = {};

  chaves.forEach((chave) => {
    mapaNormalizado[normalizarNomeCampo(chave)] = item[chave];
  });

  const nomeNormalizado = normalizarNomeCampo(nome);

  return String(item[nomeNormalizado]).trim()
  
  // for (const nome of nomes) {
  //   const nomeNormalizado = normalizarNomeCampo(nome);

  //   if (Object.prototype.hasOwnProperty.call(item, nome)) {
  //     const valor = item[nome];
  //     if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
  //       return String(valor).trim();
  //     }
  //   }

    // if (Object.prototype.hasOwnProperty.call(mapaNormalizado, nomeNormalizado)) {
  //     const valor = mapaNormalizado[nomeNormalizado];
  //     if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
  //       return String(valor).trim();
  //     }
  //   }
  // }

  return '';
}

function normalizarCompetencia(valor) {
  const texto = String(valor || '').trim();
  if (!texto) {
    return '';
  }

  const textoSemEspacos = texto.replace(/\s+/g, '');
  const matchDiaMesAno = textoSemEspacos.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const matchMesAno = textoSemEspacos.match(/^(\d{1,2})[\/-](\d{4})$/);
  const matchAnoMes = textoSemEspacos.match(/^(\d{4})[\/-](\d{1,2})$/);

  if (matchDiaMesAno) {
    const [, , mes, ano] = matchDiaMesAno;
    return `${String(Number(mes)).padStart(2, '0')}/${ano}`;
  }

  if (matchMesAno) {
    const [, mes, ano] = matchMesAno;
    return `${String(Number(mes)).padStart(2, '0')}/${ano}`;
  }

  if (matchAnoMes) {
    const [, ano, mes] = matchAnoMes;
    return `${String(Number(mes)).padStart(2, '0')}/${ano}`;
  }

  return texto.toLowerCase();
}

const RotinaService = {
  construirChaveRotinaCompetencia: (item) => {
    if (!item) {
      return '';
    }

    const idRotina = obterValorCampo(item, 'id_rotina')
      .trim()
      .toLowerCase();

    const competencia = normalizarCompetencia(
      obterValorCampo(item, 'competencia')
    ).toLowerCase();

    if (!idRotina || !competencia) {
      return '';
    }

    return `${idRotina}_${competencia}`;
  },

  validarRotinaNaCompetencia: (dados) => {
    const entradas = Array.isArray(dados) ? dados : [dados];

    if (!entradas.length || !entradas[0]) {
      throw new Error('Dados inválidos para validar rotina');
    }

    const item = entradas[0];
    const chaveAtual = RotinaService.construirChaveRotinaCompetencia(item);

    if (!chaveAtual) {
      return { sucesso: true, jaExiste: false, mensagem: null };
    }

    const dadosObjetos = lerDadosComoObjetos();
    const chavesExistentes = Array.from(new Set (dadosObjetos
      .map((registro) => RotinaService.construirChaveRotinaCompetencia(registro))
      .filter(Boolean)));

    const jaExiste = chavesExistentes.includes(chaveAtual);

    return {
      sucesso: true,
      jaExiste,
      mensagem: jaExiste
        ? `A competência ${item.competencia} para a rotina selecionada já foi atualizada.`
        : null,
    };
  },

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
          Logger.log(`Unidade ${item.id_empresa} cumpriu a rotina ${item.rotina}. Nenhuma pasta será criada.`);
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

    Logger.log(
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
    const idRotina = String(
      item.id_rotina ||
      item.idrotina ||
      item.id ||
      item.rotina_id ||
      item['id_rotina'] ||
      ''
    ).trim();
    const emailUsuario = obterEmailUsuario();

    planilha.appendRow([
      Utilities.getUuid(),
      agora,
      `'${item.id_empresa}`,
      idRotina,
      item.rotina,
      item.competencia,
      item.status,
      item.justificativa,
      emailUsuario,
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

function empresasNaPasta() {
  const parentFolderId = '1AylbJYSnMdzRGICd4VBiRsY5CoQuWUQl';
  try {
    let parentFolder = DriveApp.getFolderById(parentFolderId);
    let childFolders = parentFolder.getFolders();
    let empresasPastasIds = {};

    while (childFolders.hasNext()) {
      let folder = childFolders.next();
      let chave = String(folder.getName()).substring(0, 3);
      // { id_empresa : folderId }
      empresasPastasIds[chave] = folder.getId();
    }
    Logger.log(empresasPastasIds);
    return empresasPastasIds;
  } catch (e) {
    Logger.log('Erro ao buscar as pastas: ' + e.toString());
  }
}

const CONFIG = {
  // ID da pasta raiz do projeto (se necessário para outros fins)
  DRIVE_FOLDER_ID: '1tb9tcnmpeNm2NHZLBcOOYMy8ldksppKg',
  
  // ID da planilha para registrar os resultados
  SPREADSHEET_ID: '1eAMoLMG415cqMo_pWwIcieaKAjJ0Sew-rHiGAIZvfh0',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1eAMoLMG415cqMo_pWwIcieaKAjJ0Sew-rHiGAIZvfh0',

  EMPRESAS_DRIVE_IDS: empresasNaPasta(),
};


function lerDadosComoObjetos() {
  const ID_PLANILHA = '1eAMoLMG415cqMo_pWwIcieaKAjJ0Sew-rHiGAIZvfh0';
  const URL_PLANILHA = `https://docs.google.com/spreadsheets/d/${ID_PLANILHA}`;

  let ss = null;

  try {
    ss = SpreadsheetApp.openById(ID_PLANILHA);
  } catch (error) {
    console.warn('Não foi possível abrir pelo ID. Tentando pela URL...', error);
    try {
      ss = SpreadsheetApp.openByUrl(URL_PLANILHA);
    } catch (errUrl) {
      console.warn('Não foi possível abrir pela URL. Usando planilha ativa.', errUrl);
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
  }

  if (!ss) {
    throw new Error('Não foi possível conectar a nenhuma planilha.');
  }

  const aba = ss.getActiveSheet();
  const dados = aba.getDataRange().getDisplayValues();

  if (!dados || dados.length === 0) return [];

  const primeiraLinha = (dados[0] || []).map((valor) => String(valor || '').trim());
  const temCabecalho = primeiraLinha.some((valor) => /rotina|competencia|status|id_empresa/i.test(valor));

  const cabecalhos = temCabecalho
    ? primeiraLinha
    : ['data', 'uuid', 'id_empresa', 'id_rotina', 'rotina', 'competencia', 'status', 'justificativa', 'email_usuario', 'evidencias'];

  const linhas = temCabecalho ? dados.slice(1) : dados;

  const dadosObjetos = linhas
    .filter((linha) => linha.some((valor) => String(valor || '').trim()))
    .map((linha) => {
      const obj = {};
      cabecalhos.forEach((cabecalho, index) => {
        const nomeCampo = normalizarNomeCampo(cabecalho);
        obj[nomeCampo] = linha[index] || '';
      });
      return obj;
    });

  return dadosObjetos;
}

