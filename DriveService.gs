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

        return `https://drive.google.com/file/d/${fileId}/view`;
      } catch (error) {
        console.error('Erro ao salvar arquivo no Drive:', error);
        return '';
      }
    });
  },
};
