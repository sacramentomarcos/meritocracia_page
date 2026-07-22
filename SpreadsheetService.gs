const SpreadsheetService = {
  salvarRegistro: (item, urlsArquivos) => {
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
