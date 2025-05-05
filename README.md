# Geração de Declarações DMED em PDF - Saúde Recife 🏥📄

Este projeto é uma aplicação web desenvolvida em JavaScript que processa arquivos no formato DMED (padrão da Receita Federal do Brasil) para gerar declarações em PDF referentes a contribuições realizadas ao sistema de Saúde Recife.

## Funcionalidades

* Upload de arquivo `.txt` no padrão DMED.
* Extração automática dos dados dos titulares e seus dependentes.
* Geração de arquivos PDF individuais com base em um template predefinido.
* Validação de CPF.
* Interface de busca por CPF para gerar a declaração correspondente.

## Tecnologias Utilizadas

* JavaScript (puro)
* [jsPDF](https://github.com/parallax/jsPDF) para geração dos PDFs
* HTML5/CSS3 com TailwindCSS (via classes utilitárias)

## Como Usar

1. Clone o repositório:

```bash
https://github.com/juanalenca/aplicacao-dmed.git
```

2. Abra o arquivo `index.html` no navegador.

3. Clique para selecionar um arquivo `.txt` no formato DMED.

4. Clique em "Processar" e use o campo de busca de CPF para gerar os PDFs individuais.

## Formato do Arquivo DMED

O arquivo deve seguir o seguinte padrão:

```
TOP|12345678901|NOME DO TITULAR|000012345
DTOP|98765432100||NOME DO DEPENDENTE||000001234
```

## Exemplo de Saída

* PDF nomeado como `declaracao_<cpf>.pdf`
* Com a declaração formatada, valores convertidos para reais, nome e CPF formatados.

## Contribuição

Pull requests são bem-vindos. Para grandes mudanças, abra uma issue primeiro para discutirmos o que você gostaria de modificar.
