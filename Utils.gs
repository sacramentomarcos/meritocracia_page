const Utils = {
  gerarAliasArquivo: (file, index) => {
    const nomeArquivo = file.name || `arquivo_${index + 1}`;
    if (!file.name || file.name === 'image.png') {
      return `print_${Date.now()}_${index + 1}.png`;
    }

    return nomeArquivo;
  },
};
