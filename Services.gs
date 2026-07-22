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
