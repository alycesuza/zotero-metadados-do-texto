# Validação da versão 0.1.0

Testes de integração executados em perfil isolado do Zotero 10.0.8 no Windows, com registros e PDF sintéticos. Nenhum registro da biblioteca de uso foi usado ou alterado. O arquivo validation.json contém os 26 resultados da sessão conjunta dos cinco plugins independentes.

Foram conferidos carregamento dos cinco plugins, coluna e código do anexo, extração de texto do PDF, propostas de DOI, gravação revisada e reversão, auditoria de identificador inválido, sinal de draft como apontamento para revisão, lista esperada de cobertura, persistência local da lista e carregamento/análise nas quatro janelas.

A suíte de regras e ciclo de vida é reproduzível com npm test. A integração nativa não roda no GitHub Actions: precisa de Zotero Desktop e perfil de teste separado. Antes de promover a release a estável, valide também seleção real de arquivos no diálogo de exportação, ordenação/redimensionamento da coluna, outras traduções e plataformas. Não foi feita revisão jurídica de documentos ou validação de uma biblioteca real inteira.

Para uma conferência manual, crie um perfil de testes, instale o XPI publicado, cadastre duas referências sintéticas com valores intencionalmente ausentes/incorretos e um PDF com camada de texto. Teste as funções indicadas no README, exporte o CSV e desative a extensão para verificar a remoção dos elementos da interface. No plugin de metadados, teste também uma edição posterior à correção: Desfazer deve preservar essa edição e interromper a reversão.
