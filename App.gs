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

        return `https:drive.google.com/file/d/${fileId}/view`;
      } catch (error) {
        console.error('Erro ao salvar arquivo no Drive:', error);
        return '';
      }
    });
  },
};

const RotinaService = {
  salvarRotina: (dados) => {
    const pastaDestino = DriveService.obterPasta(CONFIG.DRIVE_FOLDER_ID);

    dados.forEach((item) => {
      const urlsArquivos = DriveService.salvarArquivos(pastaDestino, item.arquivos || []);
      SpreadsheetService.salvarRegistro(item, urlsArquivos);
    });

    return { sucesso: true };
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
  DRIVE_FOLDER_ID: '1tb9tcnmpeNm2NHZLBcOOYMy8ldksppKg',
  SPREADSHEET_ID: '1eAMoLMG415cqMo_pWwIcieaKAjJ0Sew-rHiGAIZvfh0',
  SPREADSHEET_URL: 'https:docs.google.com/spreadsheets/d/1eAMoLMG415cqMo_pWwIcieaKAjJ0Sew-rHiGAIZvfh0',
};

