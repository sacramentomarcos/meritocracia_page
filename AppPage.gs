const CONFIG = {
  DRIVE_FOLDER_ID: '1tb9tcnmpeNm2NHZLBcOOYMy8ldksppKg',
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

const DriveService = {
  obterPasta: (folderId) => DriveApp.getFolderById(folderId),

  salvarArquivos: (pasta, arquivos) => {
    return arquivos.map((arq) => {
      const bytes = Utilities.base64Decode(arq.base64Content);
      const blob = Utilities.newBlob(bytes, arq.type, arq.name);
      const arquivoCriado = pasta.createFile(blob);
      return arquivoCriado.getUrl();
    });
  },
};

const SpreadsheetService = {
  salvarRegistro: (item, urlsArquivos) => {
    const ss = SpreadsheetApp.openByUrl('');
    const planilha = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    planilha.appendRow([
      new Date(),
      item.empresa,
      item.status,
      item.justificativa,
      urlsArquivos.join('\n'),
    ]);
  },
};

const RotinaService = {
  salvarRotina: (dados) => {
    const pasta = DriveService.obterPasta(CONFIG.DRIVE_FOLDER_ID);

    dados.forEach((item) => {
      const urlsArquivos = DriveService.salvarArquivos(pasta, item.arquivos || []);
      SpreadsheetService.salvarRegistro(item, urlsArquivos);
    });

    return { sucesso: true };
  },
};
