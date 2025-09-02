// Estado da aplicação
let currentProfile = null;
let currentStep = 1;
let calculationResults = null;

// Fatores de emissão (tCO2e)
const EMISSION_FACTORS = {
  // Combustíveis (tCO2e/litro)
  fuels: {
    "gasolina-comum": 0.002256,
    "gasolina-aditivada": 0.002256,
    etanol: 0.001521,
    diesel: 0.002671,
    gnv: 0.001947, // por m³
    eletrico: 0,
    hibrido: 0.001128,
  },

  // Energia elétrica (tCO2e/kWh) - Brasil
  electricity: 0.000075,

  // Gás (tCO2e por unidade)
  gas: {
    gn: 0.002016, // por m³
    "glp-botijao": 0.039, // por botijão 13kg
    "glp-encanado": 0.003, // por kg
  },

  // Água (tCO2e/m³)
  water: 0.000344,

  // Transporte público (tCO2e/km)
  publicTransport: 0.000089,

  // Aviação (tCO2e/km por passageiro)
  aviation: {
    nacional: {
      economica: 0.000133,
      executiva: 0.0002,
      primeira: 0.000266,
    },
    internacional: {
      economica: 0.000151,
      executiva: 0.000227,
      primeira: 0.000302,
    },
  },

  // Resíduos (tCO2e/kg)
  waste: {
    "aterro-sanitario": 0.001,
    incineracao: 0.0005,
    lixao: 0.0015,
    reciclagem: -0.0002, // crédito
    compostagem: -0.0001, // crédito
  },

  // Alimentação (tCO2e/ano por pessoa)
  diet: {
    vegana: 1.5,
    vegetariana: 1.7,
    pescatariana: 2.3,
    flexitariana: 3.2,
    onivora: 3.8,
  },

  // Frequência de consumo de carne (multiplicador)
  meatFrequency: {
    raramente: 0.2,
    mensalmente: 0.5,
    "1-2-vezes": 1.0,
    "3-5-vezes": 1.5,
    diariamente: 2.0,
  },

  // Bens e serviços (tCO2e por R\$ 1000)
  goods: {
    eletronicos: 0.5,
    vestuario: 0.8,
    viagens: 0.3,
    moveis: 0.4,
    eletrodomesticos: 0.6,
    "servicos-financeiros": 0.1,
    outros: 0.3,
  },
};

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  // Event listeners para formulários
  document
    .getElementById("pf-calculator")
    .addEventListener("submit", handlePFSubmit);

  // Event listeners para navegação
  setupNavigation();

  console.log("Aplicação inicializada");
}

// Seleção de perfil
function selectProfile(profile) {
  currentProfile = profile;
  currentStep = 1;

  // Esconder seleção de perfil
  document.getElementById("profile-selection").classList.remove("active");

  // Mostrar formulário correspondente
  if (profile === "pf") {
    document.getElementById("pf-form").classList.add("active");
    showStep("pf", 1);
    updateProgress("pf", 1);
  } else if (profile === "pj") {
    // Implementar formulário PJ
    alert("Formulário para Pessoa Jurídica será implementado em breve!");
    document.getElementById("profile-selection").classList.add("active");
  }
}

// Navegação entre etapas
function nextStep(profile, step) {
  if (validateStep(profile, step)) {
    currentStep++;
    showStep(profile, currentStep);
    updateProgress(profile, currentStep);
  }
}

function prevStep(profile, step) {
  currentStep--;
  showStep(profile, currentStep);
  updateProgress(profile, currentStep);
}

function showStep(profile, step) {
  // Esconder todas as etapas
  const steps = document.querySelectorAll(`#${profile}-form .form-step`);
  steps.forEach((s) => s.classList.remove("active"));

  // Mostrar etapa atual
  const currentStepElement = document.querySelector(
    `#${profile}-form .form-step[data-step="${step}"]`
  );
  if (currentStepElement) {
    currentStepElement.classList.add("active");
  }
}

function updateProgress(profile, step) {
  const totalSteps = document.querySelectorAll(
    `#${profile}-form .form-step`
  ).length;
  const progress = (step / totalSteps) * 100;

  const progressBar = document.getElementById(`${profile}-progress`);
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

// Validação de etapas
function validateStep(profile, step) {
  const currentStepElement = document.querySelector(
    `#${profile}-form .form-step[data-step="${step}"]`
  );
  const requiredFields = currentStepElement.querySelectorAll("[required]");

  let isValid = true;

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      field.style.borderColor = "#e74c3c";
      isValid = false;
    } else {
      field.style.borderColor = "";
    }
  });

  if (!isValid) {
    alert(
      "Por favor, preencha todos os campos obrigatórios antes de continuar."
    );
  }

  return isValid;
}

// Toggle de seções condicionais
function toggleSection(sectionId, show) {
  const section = document.getElementById(sectionId);
  if (section) {
    if (show) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  }
}

// Manipulação do formulário PF
function handlePFSubmit(event) {
  event.preventDefault();

  if (validateStep("pf", currentStep)) {
    const formData = collectPFData();
    const results = calculatePFEmissions(formData);
    displayResults(results);
    showNeutralizationOptions(results.total);
  }
}

// Coleta de dados do formulário PF
function collectPFData() {
  return {
    // Informações básicas
    periodo: document.getElementById("pf-periodo").value,
    uf: document.getElementById("pf-uf").value,
    cidade: document.getElementById("pf-cidade").value,
    residentes: parseInt(document.getElementById("pf-residentes").value) || 1,

    // Transporte
    veiculo: {
      possui:
        document.querySelector('input[name="pf-veiculo"]:checked')?.value ===
        "sim",
      tipo: document.getElementById("pf-tipo-veiculo").value,
      combustivel: document.getElementById("pf-combustivel").value,
      consumo:
        parseFloat(document.getElementById("pf-consumo-combustivel").value) ||
        0,
    },

    transportePublico: {
      utiliza:
        document.querySelector('input[name="pf-transporte-publico"]:checked')
          ?.value === "sim",
      distancia:
        parseFloat(document.getElementById("pf-distancia-transporte").value) ||
        0,
      frequencia: document.getElementById("pf-frequencia-transporte").value,
    },

    voos: {
      realiza:
        document.querySelector('input[name="pf-voos"]:checked')?.value ===
        "sim",
      nacionais:
        parseInt(document.getElementById("pf-voos-nacionais").value) || 0,
      distanciaNacional:
        parseFloat(
          document.getElementById("pf-distancia-voo-nacional").value
        ) || 0,
      classe: document.getElementById("pf-classe-voo").value,
    },

    // Consumo residencial
    energia: {
      consumo:
        parseFloat(document.getElementById("pf-consumo-energia").value) || 0,
      fonte: document.getElementById("pf-fonte-energia").value,
    },

    gas: {
      utiliza:
        document.querySelector('input[name="pf-gas"]:checked')?.value === "sim",
      tipo: document.getElementById("pf-tipo-gas").value,
      consumo: parseFloat(document.getElementById("pf-consumo-gas").value) || 0,
    },

    agua: {
      consumo:
        parseFloat(document.getElementById("pf-consumo-agua").value) || 0,
    },

    // Resíduos
    residuos: {
      lixoSemanal:
        parseFloat(document.getElementById("pf-lixo-semanal").value) || 0,
      reciclagem:
        document.querySelector('input[name="pf-reciclagem"]:checked')?.value ===
        "sim",
      percentualReciclavel:
        parseFloat(document.getElementById("pf-percentual-reciclavel").value) ||
        0,
      compostagem:
        document.querySelector('input[name="pf-compostagem"]:checked')
          ?.value === "sim",
      percentualCompostagem:
        parseFloat(
          document.getElementById("pf-percentual-compostagem").value
        ) || 0,
      descarte: document.getElementById("pf-descarte-lixo").value,
    },

    // Alimentação
    alimentacao: {
      dieta: document.getElementById("pf-tipo-dieta").value,
      carneBovina: document.getElementById("pf-carne-bovina").value,
      avesSuinos: document.getElementById("pf-aves-suinos").value,
      processados: document.getElementById("pf-processados").value,
      locaisSazonais: document.getElementById("pf-locais-sazonais").value,
    },
  };
}

// Cálculo de emissões PF
function calculatePFEmissions(data) {
  const results = {
    transporte: 0,
    residencial: 0,
    residuos: 0,
    alimentacao: 0,
    bensServicos: 0,
    total: 0,
    breakdown: {},
  };

  // Cálculo de Transporte
  if (data.veiculo.possui && data.veiculo.consumo > 0) {
    const fatorCombustivel =
      EMISSION_FACTORS.fuels[data.veiculo.combustivel] || 0;
    results.transporte += (data.veiculo.consumo * fatorCombustivel) / 6;
    results.breakdown.veiculo = data.veiculo.consumo * fatorCombustivel;
  }

  if (data.transportePublico.utiliza && data.transportePublico.distancia > 0) {
    let distanciaAnual = data.transportePublico.distancia;

    // Ajustar por frequência
    const frequenciaMultiplier = {
      diariamente: 365,
      semanalmente: 52,
      mensalmente: 12,
      "poucas-vezes": 4,
    };

    distanciaAnual *=
      frequenciaMultiplier[data.transportePublico.frequencia] || 1;

    const emissaoTransporte = distanciaAnual * EMISSION_FACTORS.publicTransport;
    results.transporte += emissaoTransporte;
    results.breakdown.transportePublico = emissaoTransporte;
  }

  if (
    data.voos.realiza &&
    data.voos.nacionais > 0 &&
    data.voos.distanciaNacional > 0
  ) {
    const fatorVoo =
      EMISSION_FACTORS.aviation.nacional[data.voos.classe] ||
      EMISSION_FACTORS.aviation.nacional.economica;
    const emissaoVoos =
      data.voos.nacionais * data.voos.distanciaNacional * fatorVoo;
    results.transporte += emissaoVoos;
    results.breakdown.voos = emissaoVoos;
  }

  // Cálculo Residencial
  if (data.energia.consumo > 0) {
    const consumoAnual = data.energia.consumo * 12 * 0.8;
    let fatorEnergia = EMISSION_FACTORS.electricity;

    // Ajustar se for energia solar
    if (data.energia.fonte === "paineis-solares") {
      fatorEnergia *= 0.3; // Assumindo 70% de geração própria
    }

    const emissaoEnergia = (consumoAnual * fatorEnergia) / data.residentes;
    results.residencial += emissaoEnergia;
    results.breakdown.energia = emissaoEnergia;
  }

  if (data.gas.utiliza && data.gas.consumo > 0) {
    const fatorGas = EMISSION_FACTORS.gas[data.gas.tipo] || 0;
    const consumoAnual = data.gas.consumo * 4;
    const emissaoGas = (consumoAnual * fatorGas) / data.residentes;
    results.residencial += emissaoGas;
    results.breakdown.gas = emissaoGas;
  }

  if (data.agua.consumo > 0) {
    const consumoAnual = data.agua.consumo * 12;
    const emissaoAgua =
      (consumoAnual * EMISSION_FACTORS.water) / data.residentes;
    results.residencial += emissaoAgua;
    results.breakdown.agua = emissaoAgua;
  }

  // Cálculo de Resíduos
  if (data.residuos.lixoSemanal > 0) {
    const lixoAnual = (data.residuos.lixoSemanal * 52) / data.residentes;
    let emissaoResiduos =
      lixoAnual * EMISSION_FACTORS.waste[data.residuos.descarte];

    // Descontar reciclagem
    if (data.residuos.reciclagem && data.residuos.percentualReciclavel > 0) {
      const lixoReciclado =
        lixoAnual * (data.residuos.percentualReciclavel / 100);
      emissaoResiduos += lixoReciclado * EMISSION_FACTORS.waste.reciclagem;
    }

    // Descontar compostagem
    if (data.residuos.compostagem && data.residuos.percentualCompostagem > 0) {
      const lixoCompostado =
        lixoAnual * (data.residuos.percentualCompostagem / 100);
      emissaoResiduos += lixoCompostado * EMISSION_FACTORS.waste.compostagem;
    }

    results.residuos = Math.max(0, emissaoResiduos);
    results.breakdown.residuos = results.residuos;
  }

  // Cálculo de Alimentação
  let emissaoAlimentacao =
    EMISSION_FACTORS.diet[data.alimentacao.dieta] ||
    EMISSION_FACTORS.diet.onivora;

  // Ajustar por frequência de carne
  if (data.alimentacao.carneBovina) {
    const multiplicadorCarne =
      EMISSION_FACTORS.meatFrequency[data.alimentacao.carneBovina] || 1;
    emissaoAlimentacao *= multiplicadorCarne;
  }

  // Ajustar por alimentos processados
  if (data.alimentacao.processados === "diariamente") {
    emissaoAlimentacao *= 1.3;
  } else if (data.alimentacao.processados === "3-5-vezes") {
    emissaoAlimentacao *= 1.2;
  }

  // Descontar alimentos locais/sazonais
  if (data.alimentacao.locaisSazonais === "sempre") {
    emissaoAlimentacao *= 0.8;
  } else if (data.alimentacao.locaisSazonais === "quase-sempre") {
    emissaoAlimentacao *= 0.9;
  }

  results.alimentacao = emissaoAlimentacao;
  results.breakdown.alimentacao = emissaoAlimentacao;

  // Total
  results.total =
    results.transporte +
    results.residencial +
    results.residuos +
    results.alimentacao;

  return results;
}

// Exibição de resultados
function displayResults(results) {
  calculationResults = results;

  const resultsContent = document.getElementById("results-content");

  resultsContent.innerHTML = `
        <div class="results-summary">
            <div class="total-emissions">${results.total.toFixed(2)}</div>
            <div class="emissions-unit">tCO₂e por ano</div>
            <p>Este é o total de Gases de Efeito Estufa que suas atividades geraram no período selecionado.</p>
        </div>
        
        <div class="results-chart">
            <canvas id="emissions-chart" width="400" height="200"></canvas>
        </div>
        
        <table class="results-table">
            <thead>
                <tr>
                    <th>Categoria</th>
                    <th>Emissão (tCO₂e)</th>
                    <th>% do Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><i class="fas fa-car"></i> Transporte</td>
                    <td>${results.transporte.toFixed(2)}</td>
                    <td>${((results.transporte / results.total) * 100).toFixed(
                      1
                    )}%</td>
                </tr>
                <tr>
                    <td><i class="fas fa-home"></i> Consumo Residencial</td>
                    <td>${results.residencial.toFixed(2)}</td>
                    <td>${((results.residencial / results.total) * 100).toFixed(
                      1
                    )}%</td>
                </tr>
                <tr>
                    <td><i class="fas fa-recycle"></i> Resíduos</td>
                    <td>${results.residuos.toFixed(2)}</td>
                    <td>${((results.residuos / results.total) * 100).toFixed(
                      1
                    )}%</td>
                </tr>
                <tr>
                    <td><i class="fas fa-utensils"></i> Alimentação</td>
                    <td>${results.alimentacao.toFixed(2)}</td>
                    <td>${((results.alimentacao / results.total) * 100).toFixed(
                      1
                    )}%</td>
                </tr>
            </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center;">
            <p><strong>Comparativo:</strong> Sua pegada equivale a aproximadamente ${(
              results.total * 2174
            ).toFixed(0)} km rodados de carro.</p>
        </div>
    `;

  // Mostrar seção de resultados
  document.getElementById("pf-form").classList.remove("active");
  document.getElementById("results").classList.add("active");

  // Criar gráfico
  createEmissionsChart(results);
}

// Criar gráfico de emissões
function createEmissionsChart(results) {
  const canvas = document.getElementById("emissions-chart");
  const ctx = canvas.getContext("2d");

  const data = [
    { label: "Transporte", value: results.transporte, color: "#FF6384" },
    { label: "Residencial", value: results.residencial, color: "#36A2EB" },
    { label: "Resíduos", value: results.residuos, color: "#FFCE56" },
    { label: "Alimentação", value: results.alimentacao, color: "#4BC0C0" },
    { label: "Bens e Serviços", value: results.bensServicos, color: "#9966FF" },
  ];

  // Gráfico de pizza simples
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  let currentAngle = 0;

  data.forEach((item) => {
    const sliceAngle = (item.value / results.total) * 2 * Math.PI;

    // Desenhar fatia
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = item.color;
    ctx.fill();

    // Desenhar label
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
    const labelY = centerY + Math.sin(labelAngle) * (radius + 30);

    ctx.fillStyle = "#333";
    ctx.font = "12px Inter";
    ctx.textAlign = "center";
    ctx.fillText(item.label, labelX, labelY);
    ctx.fillText(`${item.value.toFixed(1)} tCO₂e`, labelX, labelY + 15);

    currentAngle += sliceAngle;
  });
}

// Opções de neutralização
function showNeutralizationOptions(totalEmissions) {
  const neutralizationContent = document.getElementById(
    "neutralization-content"
  );
  const costPerTon = 50; // R\$ por tCO2e
  const totalCost = totalEmissions * costPerTon;

  neutralizationContent.innerHTML = `
        <div class="cost-estimate">
            <div class="cost-value">R\$ ${totalCost.toFixed(2)}</div>
            <p>Custo estimado para neutralizar ${totalEmissions.toFixed(
              2
            )} tCO₂e</p>
            <small>Baseado em um preço médio de R\$ ${costPerTon} por tonelada de CO₂e</small>
        </div>
        
        <h3>Projetos de Compensação Disponíveis:</h3>
        
        <div class="projects-grid">
            <div class="project-card">
                <i class="fas fa-tree" style="font-size: 2rem; color: var(--leaf-green); margin-bottom: 15px;"></i>
                <h4>Reflorestamento</h4>
                <p>Projetos que plantam árvores ou protegem florestas existentes, absorvendo CO₂ da atmosfera.</p>
                <div class="project-price">R\$ ${(totalCost * 0.8).toFixed(
                  2
                )}</div>
            </div>
            
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <button class="btn-calculate" onclick="window.open('https://smartesg-eco-br-426217.builder-preview.com/contato', '_blank')">
                <i class="fas fa-leaf"></i> Compensar Agora
            </button>
            <br><br>
            <a href="#home" style="color: var(--secondary-green);">Saiba mais sobre créditos de carbono</a>
        </div>
        
        <div style="margin-top: 40px; padding: 20px; background: rgba(143, 188, 143, 0.1); border-radius: 8px;">
            <h4><i class="fas fa-lightbulb"></i> Dicas para Reduzir sua Pegada de Carbono:</h4>
            <ul style="margin-top: 15px; padding-left: 20px;">
                <li>Use transporte público, bicicleta ou caminhe sempre que possível</li>
                <li>Reduza o consumo de carne, especialmente carne bovina</li>
                <li>Invista em energia solar para sua residência</li>
                <li>Separe o lixo para reciclagem e faça compostagem</li>
                <li>Compre produtos locais e sazonais</li>
                <li>Evite o desperdício de energia e água</li>
                <li>Prefira produtos duráveis e de segunda mão</li>
            </ul>
        </div>
    `;

  // Mostrar seção de neutralização
  document.getElementById("neutralization").classList.add("active");
}

// Setup de navegação
function setupNavigation() {
  // Adicionar listeners para voltar ao início
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      resetApp();
    }
  });
}

// Reset da aplicação
function resetApp() {
  currentProfile = null;
  currentStep = 1;
  calculationResults = null;

  // Esconder todas as seções
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  // Mostrar seleção de perfil
  document.getElementById("profile-selection").classList.add("active");

  // Reset formulários
  document.getElementById("pf-calculator").reset();

  // Reset progress bar
  const progressBar = document.getElementById("pf-progress");
  if (progressBar) {
    progressBar.style.width = "0%";
  }
}

// Utilitários
function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Adicionar botão de reset nos resultados
function addResetButton() {
  const resetButton = document.createElement("button");
  resetButton.className = "btn-prev";
  resetButton.innerHTML = '<i class="fas fa-redo"></i> Calcular Novamente';
  resetButton.onclick = resetApp;

  return resetButton;
}

// Exportar dados (funcionalidade adicional)
function exportResults() {
  if (!calculationResults) return;

  const data = {
    timestamp: new Date().toISOString(),
    profile: "Pessoa Física",
    total: calculationResults.total,
    breakdown: calculationResults.breakdown,
    categories: {
      transporte: calculationResults.transporte,
      residencial: calculationResults.residencial,
      residuos: calculationResults.residuos,
      alimentacao: calculationResults.alimentacao,
      bensServicos: calculationResults.bensServicos,
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pegada-carbono-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

console.log(
  "Script de calculadora de pegada de carbono carregado com sucesso!"
);

// Atualizar a função selectProfile para incluir PJ
function selectProfile(profile) {
  currentProfile = profile;
  currentStep = 1;

  // Esconder seleção de perfil
  document.getElementById("profile-selection").classList.remove("active");

  // Mostrar formulário correspondente
  if (profile === "pf") {
    document.getElementById("pf-form").classList.add("active");
    showStep("pf", 1);
    updateProgress("pf", 1);
  } else if (profile === "pj") {
    document.getElementById("pj-form").classList.add("active");
    showStep("pj", 1);
    updateProgress("pj", 1);
    setupPJFormListeners();
  }
}

// Setup de listeners específicos para PJ
function setupPJFormListeners() {
  // Event listener para o formulário PJ
  document
    .getElementById("pj-calculator")
    .addEventListener("submit", handlePJSubmit);

  // Listener para origem da energia
  document
    .getElementById("pj-energia-origem")
    .addEventListener("change", function () {
      const certificadoDetails = document.getElementById(
        "pj-certificado-details"
      );
      if (this.value === "renovavel-certificada") {
        certificadoDetails.style.display = "block";
      } else {
        certificadoDetails.style.display = "none";
      }
    });
}

// Fatores de emissão para PJ
const PJ_EMISSION_FACTORS = {
  // Combustão estacionária (tCO2e por unidade)
  stationaryCombustion: {
    "gas-natural": 0.002016, // por m³
    glp: 0.003, // por kg
    diesel: 0.002671, // por litro
    "oleo-combustivel": 0.003179, // por litro
    "carvao-mineral": 2.42, // por tonelada
    biomassa: 0.0, // considerado neutro
    outro: 0.002,
  },

  // Combustão móvel (tCO2e por litro)
  mobileCombustion: {
    gasolina: 0.002256,
    etanol: 0.001521,
    diesel: 0.002671,
    gnv: 0.001947, // por m³
    eletrico: 0,
    hibrido: 0.001128,
    flex: 0.001888,
  },

  // Gases refrigerantes (tCO2e por kg)
  refrigerants: {
    r134a: 1.43,
    r410a: 2.09,
    r22: 1.81,
    r404a: 3.92,
    r407c: 1.77,
    outros: 2.0,
  },

  // Metano (tCO2e por m³)
  methane: 0.025,

  // Energia elétrica (tCO2e/kWh)
  electricity: 0.000075,

  // Energia de terceiros (tCO2e por unidade)
  thirdPartyEnergy: {
    vapor: 0.0002, // por GJ
    "agua-quente": 0.0001, // por GJ
    "agua-gelada": 0.00015, // por GJ
    "ar-comprimido": 0.00005, // por GJ
  },

  // Viagens de negócios
  businessTravel: {
    aereo: {
      economica: 0.000133,
      executiva: 0.0002,
      primeira: 0.000266,
    },
    rodoviario: 0.000089,
    ferroviario: 0.000041,
    "carro-aluguel": 0.000184,
    "taxi-app": 0.000184,
  },

  // Hospedagem (tCO2e por noite)
  accommodation: 0.0296,

  // Deslocamento funcionários (tCO2e/km)
  commuting: {
    "carro-particular": 0.000184,
    "transporte-publico": 0.000089,
    carona: 0.000092,
    bicicleta: 0,
    caminhada: 0,
    motocicleta: 0.000103,
    outro: 0.0001,
  },

  // Resíduos (tCO2e por kg)
  waste: {
    organico: {
      "aterro-sanitario": 0.001,
      compostagem: -0.0001,
      incineracao: 0.0005,
    },
    papel: {
      "aterro-sanitario": 0.0015,
      reciclagem: -0.0005,
      incineracao: 0.0008,
    },
    plastico: {
      "aterro-sanitario": 0.0005,
      reciclagem: -0.0003,
      incineracao: 0.002,
    },
    metal: {
      "aterro-sanitario": 0.0001,
      reciclagem: -0.001,
      incineracao: 0.0002,
    },
    vidro: {
      "aterro-sanitario": 0.0001,
      reciclagem: -0.0002,
      incineracao: 0.0001,
    },
    madeira: {
      "aterro-sanitario": 0.0008,
      reciclagem: -0.0001,
      incineracao: 0.0006,
    },
    perigoso: {
      "aterro-sanitario": 0.005,
      incineracao: 0.003,
      "co-processamento": 0.002,
    },
    eletronico: {
      "aterro-sanitario": 0.002,
      reciclagem: -0.0005,
      incineracao: 0.001,
    },
    outro: {
      "aterro-sanitario": 0.001,
      reciclagem: -0.0002,
      incineracao: 0.0005,
    },
  },
};
