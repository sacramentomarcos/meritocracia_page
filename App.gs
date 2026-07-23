function doGet(e) {
  const page = e && e.parameter && e.parameter.page === 'app' ? 'App' : 'Index';

  return HtmlService
    .createTemplateFromFile(page)
    .evaluate()
    .setTitle('Meritocracia - Envio das rotinas');
}

function salvarRotina(dados) {
  ValidationService.validarCampos(dados);
  return RotinaService.salvarRotina(dados);
}