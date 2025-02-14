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

// Exibe uma mensagem de erro na tela
function showError(message) {
  const output = document.getElementById('output');
  output.innerHTML = `<div class="error-message">${message}</div>`;
}

// Após o processamento, oculta a tela de upload e exibe a tela de pesquisa para geração dos PDFs
function displayData(titulares) {
  titularesData = titulares; // Armazena globalmente para pesquisa
  document.getElementById("uploadContainer").style.display = "none";
  let pdfContainer = document.getElementById("pdfContainer");
  pdfContainer.style.display = "block";
  pdfContainer.innerHTML = "<h2>Geração de PDFs</h2>";
  
  // Campo de pesquisa para CPF
  pdfContainer.innerHTML += '<input type="text" id="searchCPF" placeholder="Digite o CPF do titular" style="margin:10px; padding: 8px; width: 300px; font-size: 1em;" />';
  pdfContainer.innerHTML += '<div id="results" style="margin-top:20px;"></div>';
  
  // Event listener para busca
  document.getElementById("searchCPF").addEventListener("input", function(e) {
    filterTitulares(e.target.value);
  });
  
  // Mensagem inicial
  document.getElementById("results").innerHTML = "<p>Digite o CPF do titular para buscar.</p>";
}

// Filtra os titulares com base no CPF digitado
function filterTitulares(searchTerm) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = ""; // Limpa os resultados
  // Remove caracteres não numéricos para comparação
  const cleanedSearchTerm = searchTerm.replace(/\D/g, '');
  if (cleanedSearchTerm.length === 0) {
    resultsDiv.innerHTML = "<p>Digite o CPF do titular para buscar.</p>";
    return;
  }
  const filtered = titularesData.filter(titular => titular.cpf.indexOf(cleanedSearchTerm) !== -1);
  if (filtered.length === 0) {
    resultsDiv.innerHTML = "<p>Nenhum titular encontrado com esse CPF.</p>";
  } else {
    filtered.forEach(titular => {
      let btn = document.createElement("button");
      btn.textContent = `Gerar PDF para ${titular.nome} (${formatarCPF(titular.cpf)})`;
      btn.style.margin = "5px";
      btn.addEventListener("click", function(){
        generatePDF(titular);
      });
      resultsDiv.appendChild(btn);
    });
  }
}

// Gera o PDF para cada titular conforme o template solicitado
function generatePDF(titular) {
    if (!imgData) {
      alert("Imagem não carregada ainda. Tente novamente.");
      return;
    }
    
    // Cria uma instância do jsPDF em formato A4 com unidade em centímetros
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF({
      orientation: "portrait",
      unit: "cm",
      format: "a4"
    });
  
    // Insere a imagem no topo: ocupa toda a largura (21cm) e tem 3,88cm de altura
    doc.addImage(imgData, 'PNG', 0, 0, 21, 3.88);
  
    // Posição inicial após a imagem
    let y = 3.88 + 1; // ajuste se necessário
  
    // Título centralizado "DECLARAÇÃO"
    doc.setFontSize(16);
    doc.text("DECLARAÇÃO", 10.5, y, { align: "center" });
    y += 1;
  
    // Parágrafo com os dados do titular justificado à esquerda
    doc.setFontSize(12);
    let paragraph = `Declaramos para fins de apresentação à Receita Federal do Brasil que a senhora ${titular.nome} portador do ${formatarCPF(titular.cpf)}, é beneficiária titular do sistema Saúde Recife, CNPJ/MF nº05.244.336/0001-13, sediado à Avenida Manoel Borba nº488, Boa Vista, Recife, Pernambuco CEP 50.070-000. E pagou no ano de 2025, a título de contribuição ao sistema de saúde, à importância de ${formatarMoeda(titular.total)}.`;
    let textLines = doc.splitTextToSize(paragraph, 19);
    doc.text(textLines, 2, y, { align: "left" });
    y += textLines.length * 0.5 + 0.5;
  
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
  
    // Posiciona o campo de data ("Recife, ...") logo abaixo dos dados dos dependentes,
    // com um gap de 0,5 cm e alinhado à direita.
    let dateY = y + 5;
    // Obtém a data atual de acordo com as configurações do sistema
    let today = new Date();
    let options = { day: 'numeric', month: 'long', year: 'numeric' };
    let dateFormatted = today.toLocaleDateString('pt-BR', options);
    let dateStr = `Recife, ${dateFormatted}`;
    doc.text(dateStr, 19, dateY, { align: "right" });
  
    // Posiciona "Setor de Adesão e Exclusão" mais abaixo no documento, centralizado.
    let setorY = dateY + 10; // Aumentado o espaçamento para posicionar mais abaixo
    doc.text("Setor de Adesão e Exclusão", 10.5, setorY, { align: "center" });
  
    // Salva o PDF (o nome inclui o CPF do titular para diferenciar)
    doc.save(`declaracao_${titular.cpf}.pdf`);
  }
  
  
