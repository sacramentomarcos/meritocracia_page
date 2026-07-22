const ValidationService = {
  validarCampos: (dados) => {
    if (!dados || !Array.isArray(dados)) {
      throw new Error('Dados inválidos');
    }
    return true;
  },
};
