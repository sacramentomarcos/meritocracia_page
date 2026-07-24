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
      agora,                      // Coluna A: timestamp de quando foi executado o relatório
      Utilities.getUuid(),       // Coluna B: id (Gera um ID único automático)
      item.id_empresa,           // Coluna C: id_empresa
      //item.idrotina,            // Coluna D: idrotina
      8,
      item.rotina,               // Coluna E: rotina
      item.competencia || '',    // Coluna F: competência do relatório
      agora.getMonth() + 1,      // Coluna G: mes (1 a 12)
      agora.getFullYear(),       // Coluna H: ano
      item.status,               // Coluna I: cumprimento (SIM/NÃO)
      item.justificativa,
      urlsValidas.join('\n')
    ]);
  }
};
