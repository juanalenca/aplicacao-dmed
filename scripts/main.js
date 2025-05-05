// Variável global para armazenar a imagem em Data URL
let imgData = null;

// Variável global para armazenar os titulares para pesquisa
let titularesData = [];

// Função para carregar uma imagem e convertê-la em Data URL
function loadImageAsDataURL(url, callback) {
  let xhr = new XMLHttpRequest();
  xhr.onload = function() {
    let reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

// Aguarda o carregamento do DOM e da imagem
document.addEventListener("DOMContentLoaded", function() {
  // Carrega a imagem para uso no PDF
  loadImageAsDataURL("styles/img/Imagem-sauderecife.png", function(dataURL) {
    imgData = dataURL;
  });
  
  const processButton = document.getElementById("processButton");
  processButton.addEventListener("click", processFile);

  // Atualiza o nome do arquivo selecionado
  const fileInput = document.getElementById("fileInput");
  fileInput.addEventListener("change", function() {
    const fileNameSpan = document.getElementById("fileName");
    if (fileInput.files.length > 0) {
      fileNameSpan.textContent = fileInput.files[0].name;
    } else {
      fileNameSpan.textContent = "Clique para selecionar um arquivo";
    }
  });
});

// Processa o arquivo DMED (dmed.txt)
function processFile() {
  const fileInput = document.getElementById('fileInput');
  const output = document.getElementById('output');
  output.innerHTML = ''; // Limpa mensagens anteriores

  if (fileInput.files.length === 0) {
    showError('Por favor, selecione um arquivo.');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(event) {
    const content = event.target.result;
    const lines = content.split('\n');
    const titulares = [];
    let currentTitular = null;

    lines.forEach(line => {
      line = line.trim();

      if (line.startsWith('TOP')) {
        if (currentTitular) {
          titulares.push(currentTitular);
        }
        // Extrai CPF, Nome e Valor do titular
        const parts = line.split('|');
        if (parts.length >= 4) {
          const cpf = parts[1].trim();
          const nome = parts[2].trim();
          const valor = parseFloat(parts[3].trim()) / 100; // Converte para reais
          if (validateCPF(cpf)) {
            currentTitular = {
              cpf: cpf,
              nome: nome,
              valor: valor,
              dependentes: [],
              total: valor // Inicializa o total com o valor do titular
            };
          } else {
            showError(`CPF inválido encontrado: ${cpf}`);
          }
        }
      } else if (line.startsWith('DTOP')) {
        if (currentTitular) {
          // Extrai CPF, Nome e Valor do dependente
          const parts = line.split('|');
          if (parts.length >= 6) {
            const cpfDependente = parts[1].trim();
            const nomeDependente = parts[3].trim();
            const valorDependente = parseFloat(parts[5].trim()) / 100; // Converte para reais
            if (validateCPF(cpfDependente)) {
              currentTitular.dependentes.push({
                cpf: cpfDependente,
                nome: nomeDependente,
                valor: valorDependente
              });
              // Adiciona o valor do dependente ao total do titular
              currentTitular.total += valorDependente;
            } else {
              showError(`CPF inválido encontrado: ${cpfDependente}`);
            }
          }
        }
      }
    });

    // Adiciona o último titular processado
    if (currentTitular) {
      titulares.push(currentTitular);
    }

    if (titulares.length > 0) {
      displayData(titulares);
    } else {
      showError('Nenhum titular válido encontrado no arquivo.');
    }
  };

  reader.onerror = function(event) {
    showError('Erro ao ler o arquivo. Por favor, tente novamente.');
    console.error('Erro ao ler o arquivo:', event.target.error);
  };

  reader.readAsText(file);
}

// Validação simples de CPF (11 dígitos)
function validateCPF(cpf) {
  return /^\d{11}$/.test(cpf);
}

// Formata o CPF para o formato 000.000.000-00
function formatarCPF(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Formata um valor numérico para o padrão monetário brasileiro
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Desenha um parágrafo justificado no PDF.
 * @param {Object} doc - Instância do jsPDF.
 * @param {string} text - Texto do parágrafo.
 * @param {number} x - Posição x de início.
 * @param {number} y - Posição y de início.
 * @param {number} maxWidth - Largura máxima da área de texto.
 * @param {number} lineHeight - Altura da linha (em cm).
 * @param {number} firstLineIndent - Indentação da primeira linha (em cm).
 * @returns {number} - Número de linhas desenhadas.
 */
function drawJustifiedParagraph(doc, text, x, y, maxWidth, lineHeight, firstLineIndent = 0) {
  let words = text.split(/\s+/);
  let lines = [];
  let currentLine = [];
  let currentLineWidth = 0;
  let spaceWidth = doc.getTextWidth(" ");

  words.forEach(word => {
    let wordWidth = doc.getTextWidth(word);
    let additionalWidth = currentLine.length === 0 ? (lines.length === 0 ? firstLineIndent : 0) : spaceWidth;
    if (currentLineWidth + additionalWidth + wordWidth <= maxWidth) {
      currentLine.push(word);
      currentLineWidth += additionalWidth + wordWidth;
    } else {
      lines.push(currentLine);
      currentLine = [word];
      currentLineWidth = wordWidth;
    }
  });
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  for (let i = 0; i < lines.length; i++) {
    let lineWords = lines[i];
    let isLastLine = (i === lines.length - 1);
    let indent = i === 0 ? firstLineIndent : 0;
    let wordsWidth = lineWords.reduce((acc, word) => acc + doc.getTextWidth(word), 0);
    let gaps = lineWords.length - 1;
    let extraSpace = 0;
    if (!isLastLine && gaps > 0) {
      extraSpace = (maxWidth - indent - wordsWidth) / gaps;
    } else {
      extraSpace = spaceWidth;
    }
    let currentX = x + indent;
    lineWords.forEach((word, j) => {
      doc.text(word, currentX, y);
      currentX += doc.getTextWidth(word);
      if (j < lineWords.length - 1) {
        currentX += extraSpace;
      }
    });
    y += lineHeight;
  }
  return lines.length;
}

/* Gera o PDF para cada titular conforme o template solicitado */
function generatePDF(titular) {
  if (!imgData) {
    alert("Imagem não carregada ainda. Tente novamente.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF({
    orientation: "portrait",
    unit: "cm",
    format: "a4"
  });

  // Insere a imagem no topo: ocupa toda a largura (21cm) e tem 3,88cm de altura
  doc.addImage(imgData, 'PNG', 0, 0, 21, 3.88);

  // Posição inicial após a imagem
  let y = 3.88 + 1.9;
  // Título centralizado "DECLARAÇÃO"
  doc.setFontSize(16);
  doc.text("DECLARAÇÃO", 10.5, y, { align: "center" });
  y += 2;

  // Parágrafo com os dados do titular justificado (com indentação na primeira linha)
  doc.setFontSize(12);
  let paragraph = `Declaramos para fins de apresentação à Receita Federal do Brasil que a senhora ${titular.nome} portador do ${formatarCPF(titular.cpf)}, é beneficiária titular do sistema Saúde Recife, CNPJ/MF nº05.244.336/0001-13, sediado à Avenida Manoel Borba nº488, Boa Vista, Recife, Pernambuco CEP 50.070-000. E pagou no ano de 2025, a título de contribuição ao sistema de saúde, à importância de ${formatarMoeda(titular.total)}.`;
  let firstLineIndent = 1;   // 1 cm de indentação na primeira linha
  let maxWidth = 16.8;         // Largura disponível (considerando margens)
  let lineHeight = 0.5;        // Altura de cada linha (em cm)
  let linesCount = drawJustifiedParagraph(doc, paragraph, 2, y, maxWidth, lineHeight, firstLineIndent);
  y += linesCount * lineHeight + 1.5;  // Atualiza y com o total de linhas e um gap adicional

  // Linha com Nome do Titular (à esquerda) e Valor Titular (à direita)
  doc.text(titular.nome, 2, y);
  doc.text(formatarMoeda(titular.valor), 19, y, { align: "right" });
  y += 1;
  
  // Dados dos dependentes (se houver)
  if (titular.dependentes.length > 0) {
    titular.dependentes.forEach(dep => {
      doc.text(dep.nome, 2, y);
      doc.text(formatarMoeda(dep.valor), 19, y, { align: "right" });
      y += 0.7;
      doc.text(formatarCPF(dep.cpf), 2, y);
      y += 1;
    });
  }
  
  // ----------------------------
  // Posições fixas para os campos:
  // ----------------------------
  
  // Define a posição fixa (em cm) para o campo de data
  const fixedDateY = 25;  // Exemplo: 25cm do topo
  // Define a posição fixa para o "Setor de Adesão e Exclusão"
  const fixedSetorY = 28; // Exemplo: 28cm do topo

  // Campo de data ("Recife, ...") com posição fixa
  let today = new Date();
  let options = { day: 'numeric', month: 'long', year: 'numeric' };
  let dateFormatted = today.toLocaleDateString('pt-BR', options);
  let dateStr = `Recife, ${dateFormatted}`;
  doc.text(dateStr, 19, fixedDateY, { align: "right" });
  
  // "Setor de Adesão e Exclusão" centralizado com posição fixa
  doc.text("Setor de Adesão e Exclusão", 10.5, fixedSetorY, { align: "center" });
  
  // Salva o PDF com o nome baseado no CPF do titular
  doc.save(`declaracao_${titular.cpf}.pdf`);
}


// Exibe uma mensagem de erro na tela
function showError(message) {
  const output = document.getElementById('output');
  output.innerHTML = `<div class="error-message text-red-500">${message}</div>`;
}

// Após o processamento, exibe a tela de pesquisa para geração dos PDFs com design melhorado
function displayData(titulares) {
  titularesData = titulares; // Armazena globalmente para pesquisa
  document.getElementById("uploadContainer").style.display = "none";
  
  let pdfContainer = document.getElementById("pdfContainer");
  pdfContainer.style.display = "block";
  pdfContainer.innerHTML = `
    <div class="w-full max-w-md mx-auto bg-gray-800 p-6 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold text-green-400 mb-4">📄 Geração de PDFs</h2>
      <p class="text-gray-300 mb-4">Digite somente os números do CPF para buscar e gerar o PDF.</p>
      <input type="text" id="searchCPF" placeholder="CPF do titular (somente números)" class="w-full p-3 rounded-lg bg-gray-900 border border-green-600 text-white mb-4">
      <div id="results" class="mt-4"></div>
    </div>
  `;
  
  // Event listener para o campo de pesquisa
  document.getElementById("searchCPF").addEventListener("input", function(e) {
    filterTitulares(e.target.value);
  });
}

function filterTitulares(searchTerm) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = ""; // Limpa os resultados
  const cleanedSearchTerm = searchTerm.replace(/\D/g, '');
  if (cleanedSearchTerm.length === 0) {
    // Se nada foi digitado, não exibe mensagem
    return;
  }
  const filtered = titularesData.filter(titular => titular.cpf.indexOf(cleanedSearchTerm) !== -1);
  if (filtered.length === 0) {
    resultsDiv.innerHTML = "<p class='text-red-500'>CPF do titular não foi encontrado.</p>";
  } else {
    filtered.forEach(titular => {
      let btn = document.createElement("button");
      btn.textContent = `Gerar PDF para ${titular.nome} (${formatarCPF(titular.cpf)})`;
      btn.className = "w-full bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg mb-2 transition-all transform hover:scale-105";
      btn.addEventListener("click", function(){
        generatePDF(titular);
      });
      resultsDiv.appendChild(btn);
    });
  }
}
