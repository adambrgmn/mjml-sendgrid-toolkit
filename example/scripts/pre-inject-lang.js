module.exports = function injectLang(code, template) {
  return code.replace(
    '<mjml>',
    '<mjml><mj-attributes><mj-all lang="sv" /></mj-attributes>',
  );
};
