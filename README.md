# Metadados do Texto

Lê as primeiras cinco páginas dos PDFs, texto HTML/TXT e notas OCR existentes para propor correções com evidência.

[![Test and package](https://github.com/alycesuza/zotero-metadados-do-texto/actions/workflows/ci.yml/badge.svg)](https://github.com/alycesuza/zotero-metadados-do-texto/actions/workflows/ci.yml)
[Versões e instaladores](https://github.com/alycesuza/zotero-metadados-do-texto/releases) | [English](docs/README.en.md) | [Histórico de versões](CHANGELOG.md)

## Status e compatibilidade

Versão **0.1.1**, distribuída como **pré-lançamento** para validação no uso diário. Plugin independente para **Zotero 10.0.x**, usando APIs do Zotero Desktop. Não depende das outras extensões desta coleção. Não há suporte declarado para Zotero 6, 7, 8 ou 9 nesta versão.

## Instalação

1. Abra [Versões e instaladores](https://github.com/alycesuza/zotero-metadados-do-texto/releases) e escolha a versão desejada, incluindo pré-lançamentos.
2. Baixe o arquivo `zotero-metadados-do-texto-0.1.1.xpi`. Os arquivos “Source code” não são instaladores.
3. No Zotero, abra **Ferramentas > Extensões**, clique na engrenagem e escolha **Instalar extensão de arquivo**. Dependendo da tradução, o menu pode aparecer como Plugins ou Complementos.
4. Selecione o `.xpi` e confirme a instalação.

## Como usar

Selecione referências e abra **Ferramentas > Metadados do Texto - analisar seleção**. A mesma ação aparece no menu de contexto dos itens. A opção **analisar visão atual** considera os itens da visão atual, respeitando filtros. Clique em **Analisar**, confira os resultados e use **Exportar CSV**.

Para corrigir, confira a evidência e use **Aplicar esta proposta** em cada campo. O histórico local permite **Desfazer última correção**; se outra edição tiver alterado o campo, a reversão é interrompida. A extensão preserva os arquivos originais e não altera automaticamente uma biblioteca inteira.

## Limites desta versão

Versão inicial baseada em regras locais: DOI, ISBN e rótulos explícitos de título, ano e editora. Não gera OCR, não usa IA, não identifica automaticamente todos os autores ou tipos documentais e não verifica metadados em bases externas. Revise cada proposta. Um DOI encontrado pode pertencer a obra citada.

## Dados e privacidade

O processamento é local. O código não envia títulos, PDFs, OCR ou metadados a APIs de IA ou de editoras. A verificação de atualizações usa apenas o GitHub. Relatórios CSV só são gravados quando você escolhe exportar. Não inclua bibliotecas reais, PDFs, credenciais ou relatórios pessoais em Issues.

O histórico de correções fica em `zotero-metadata-from-text-history.json` no diretório de dados do Zotero. Ele contém os valores alterados e evidências e não é publicado ou enviado pelo plugin.

## Desenvolvimento

Requer Node.js 22 ou superior e Python 3.10 ou superior apenas para desenvolver e empacotar. A instalação do `.xpi` não exige Node ou Python.

```sh
npm test
python scripts/build.py
```

O `.xpi`, seu SHA-256 e `updates.json` são gerados em `build/`. Não há dependências npm de produção. A estrutura contém `src/`, `scripts/`, `tests/`, documentação, CI e publicação de Releases por tag.

## Publicar uma versão

Atualize `package.json`, `src/manifest.json`, `CHANGELOG.md` e `RELEASE_NOTES.md`, execute os testes e o build, faça o commit e crie a tag `vX.Y.Z`. O workflow de Release confere a versão, testa, empacota e publica o `.xpi`, o checksum e `updates.json` como pré-lançamento. Também é possível usar `sh release.sh` após o commit.

O endereço automático de atualização aponta a `releases/latest/download/updates.json`. O GitHub não considera pré-lançamentos como latest: a primeira versão deve ser instalada manualmente. Quando uma versão estiver validada, o mantenedor poderá promovê-la a release estável. Não se altera essa classificação automaticamente após os testes de CI.

## Desinstalar

Desative ou remova a extensão em **Ferramentas > Extensões**. Os documentos da biblioteca permanecem no Zotero. O histórico local de correções é preservado para consulta; não é apagado automaticamente.

## Licença

AGPL-3.0-only. Copyright 2026 Alyce Suza. Documentação técnica: [APIs do Zotero](https://www.zotero.org/support/dev/zotero_7_for_developers).
