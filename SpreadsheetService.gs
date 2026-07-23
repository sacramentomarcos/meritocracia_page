const SpreadsheetService = {
  salvarRegistro: (item, urlsArquivos) => {
  const ss = SpreadsheetApp.openByUrl(
    '',
  );

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
