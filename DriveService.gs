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
