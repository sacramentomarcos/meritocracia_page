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
