planilha.appendRow([
    Utilities.getUuid(),       // Coluna A: id (Gera um ID único automático)
    item.id_empresa,          // Coluna B: id_empresa
    //item.idrotina,             // Coluna C: idrotina
    8,
    item.rotina,               // Coluna D: rotina
    agora.getMonth() + 1,      // Coluna E: mes (1 a 12)
    agora.getFullYear(),       // Coluna F: ano
    item.status,                // Coluna G: cumprimento (SIM/NÃO)
    item.justificativa,
    urlsArquivos.join('\n')
  ]);

  id_empresa	rotina	id_rotina	mes	ano	cumprimento	justificativa	url_anexos