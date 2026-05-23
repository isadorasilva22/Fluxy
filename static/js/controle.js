// ================= API =================

async function obterReceitas() {
    const resposta = await fetch("/receitas", {credentials: "include"});
    return await resposta.json();
}

async function obterDespesas() {
    const resposta = await fetch("/despesas", {credentials: "include"});
    return await resposta.json();
}

async function obterTipos() {
    const resposta = await fetch("/tipos", {credentials: "include"});
    return await resposta.json();
}

async function obterFormasPagamento() {
    const res = await fetch("/formas-pagamento", {credentials: "include"});
    return await res.json();
}

async function obterLimitesMensais() {
    const res = await fetch("/limites/mensal", {credentials: "include"});
    return await res.json();
}

// ================= ELEMENTOS =================

const totalReceitasEl = document.getElementById("total-receitas");
const totalDespesasEl = document.getElementById("total-despesas");
const saldoEl = document.getElementById("saldo");

const formReceita = document.getElementById("form-receita");
const formDespesa = document.getElementById("form-despesa");

// ================= RESUMO =================

async function atualizarResumo() {

    const receitas = await obterReceitas();
    const despesas = await obterDespesas();

    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);

    const receitasMes = receitas.filter(r => 
        r.data && r.data.startsWith(mesAtual)
    );

    const despesasMes = despesas.filter(d => 
        d.data && d.data.startsWith(mesAtual)
    );

    const totalReceitas = receitasMes.reduce(
        (acc, item) => acc + Number(item.valor), 0
    );

    const totalDespesas = despesasMes.reduce(
        (acc, item) => acc + Number(item.valor), 0
    );

    const saldo = totalReceitas - totalDespesas;

    totalReceitasEl.textContent = formatarMoeda(totalReceitas);
    totalDespesasEl.textContent = formatarMoeda(totalDespesas);
    saldoEl.textContent = formatarMoeda(saldo);
}

const mesAtualEl = document.getElementById("mes-atual");

const hoje = new Date();
const mesNome = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

mesAtualEl.textContent = mesNome;

// ================= ABAS =================
async function logout() {
    await fetch("/logout", {
        method: "GET",
        credentials: "include"
    });

    window.location.href = "/login-page";
}

async function verificarLogin() {
    const res = await fetch("/me", {
        credentials: "include"
    });

    if (!res.ok) {
        window.location.href = "/login-page";
    }
}

verificarLogin();

function trocarAba(abaId, botao) {

    // Remove ativo dos botões
    document.querySelectorAll(".aba-btn").forEach(btn => {
        btn.classList.remove("ativa");
    });

    // Esconde conteúdos
    document.querySelectorAll(".aba-conteudo").forEach(aba => {
        aba.classList.remove("ativa");
    });

    // Ativa botão clicado
    botao.classList.add("ativa");

    // Mostra aba correta
    document.getElementById(`aba-${abaId}`).classList.add("ativa");

    // ===== CARREGAMENTOS =====

    if (abaId === "graficos") {
        carregarResumo();
        carregarMensal();
        carregarTipo();
        carregarForma();
    }

    if (abaId === "faturas") {
        carregarFaturas();
        carregarDetalhesFatura();
    }
}

// ================= MODAL FORMAS PAGAMENTOS =================

const btnVerFormas = document.getElementById("btn-ver-formas");
const modalFormas = document.getElementById("modal-formas");
const listaFormas = document.getElementById("lista-formas");
const modalEditarForma = document.getElementById("modal-editar-forma");
const inputNomeForma = document.getElementById("edit-forma-nome");
const inputParcelamento = document.getElementById("edit-forma-parcelamento");
const inputDia = document.getElementById("edit-dia-fechamento");
const grupoFechamentoEdit = document.getElementById("edit-grupo-fechamento");

let formaEditandoId = null;

if (btnVerFormas) {
    btnVerFormas.onclick = async () => {
        await renderizarFormasModal();
        modalFormas.classList.add("ativo");
    };
}

document.getElementById("fechar-modal-formas").onclick = () => {
    modalFormas.classList.remove("ativo");
};

async function renderizarFormasModal() {
    const formas = await obterFormasPagamento();

    listaFormas.innerHTML = "";

    formas.forEach(f => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${f.nome}</td>
            <td>${f.permite_parcelamento ? "Sim" : "Não"}</td>
            <td>${f.dia_fechamento || "-"}</td>
            <td class="acoes">
                <button onclick="editarForma(${f.id})">✏️</button>
                <button onclick="excluirForma(${f.id})">🗑️</button>
            </td>
        `;

        listaFormas.appendChild(tr);
    });
}

async function editarForma(id) {
    const formas = await obterFormasPagamento();
    const forma = formas.find(f => f.id === id);

    if (!forma) return;

    formaEditandoId = id;

    inputNomeForma.value = forma.nome;
    inputParcelamento.checked = forma.permite_parcelamento;

    if (forma.permite_parcelamento) {
        grupoFechamentoEdit.style.display = "block";
        inputDia.value = forma.dia_fechamento || "";
    } else {
        grupoFechamentoEdit.style.display = "none";
        inputDia.value = "";
    }

    modalEditarForma.classList.add("ativo");
}

inputParcelamento.addEventListener("change", () => {
    grupoFechamentoEdit.style.display =
        inputParcelamento.checked ? "block" : "none";
});

document.getElementById("btn-salvar-forma").onclick = async () => {

    const nome = inputNomeForma.value;
    const permite_parcelamento = inputParcelamento.checked;
   let dia_fechamento = null;

   if (permite_parcelamento) {
    const valor = inputDia.value.trim();

    if (valor !== "") {
        dia_fechamento = Number(valor);
    }
   }

    if (!nome) {
        mostrarToast("Digite um nome válido", "warning");
        return;
    }

    await fetch(`/formas-pagamento/${formaEditandoId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, permite_parcelamento, dia_fechamento })
    });

    mostrarToast("Forma atualizada!", "success");

    modalEditarForma.classList.remove("ativo");

    await renderizarFormasModal();
    await carregarFormasPagamento();
    await renderizarLimites();
};

document.getElementById("btn-cancelar-forma").onclick = () => {
    modalEditarForma.classList.remove("ativo");
};

modalEditarForma.addEventListener("click", (e) => {
    if (e.target === modalEditarForma) {
        modalEditarForma.classList.remove("ativo");
    }
});

async function excluirForma(id) {
    if (!confirm("Deseja excluir esta forma?")) return;

    await fetch(`/formas-pagamento/${id}`, {
        method: "DELETE",
        credentials: "include"
    });

    mostrarToast("Forma excluída!", "success");

    renderizarFormasModal();
    carregarFormasPagamento();
}

// ================= TIPOS =================

const formTipo = document.getElementById("form-tipo");

if (formTipo) {
    formTipo.addEventListener("submit", async function(e) {
        e.preventDefault();

        const nome = document.getElementById("novo-tipo").value;

        if (!nome) {
            mostrarToast("Digite um nome válido", "warning");
            return;
        }

        await fetch("http://127.0.0.1:5000/tipos", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome })
        });

        formTipo.reset();
        await carregarTipos();

        mostrarToast("Tipo cadastrado com sucesso!", "success");
    });
}

async function carregarTipos() {
    const tipos = await obterTipos();
    const select = document.getElementById("tipo-despesa");

    if (!select) return;

    select.innerHTML = `<option value="" disabled selected>Selecione um tipo</option>`;

    tipos.forEach(tipo => {
        const option = document.createElement("option");
        option.value = tipo.id;
        option.textContent = tipo.nome;
        select.appendChild(option);
    });
}

// ================= MODAL TIPOS =================

const btnVerTipos = document.getElementById("btn-ver-tipos");
const modalTipos = document.getElementById("modal-tipos");
const listaTipos = document.getElementById("lista-tipos");

const modalEditarTipo = document.getElementById("modal-editar-tipo");
const inputEditarTipo = document.getElementById("edit-tipo-nome");

let tipoEditandoId = null;

if (btnVerTipos) {
    btnVerTipos.onclick = async () => {
        await renderizarTiposModal();
        modalTipos.classList.add("ativo");
    };
}

document.getElementById("fechar-modal-tipos").onclick = () => {
    modalTipos.classList.remove("ativo");
};

async function renderizarTiposModal() {

    const tipos = await obterTipos();

    listaTipos.innerHTML = "";

    tipos.forEach(tipo => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${tipo.nome}</td>

            <td class="acoes">
                <button onclick="editarTipo(${tipo.id})">✏️</button>
                <button onclick="excluirTipo(${tipo.id})">🗑️</button>
            </td>
        `;

        listaTipos.appendChild(tr);
    });
}

async function editarTipo(id) {

    const tipos = await obterTipos();

    const tipo = tipos.find(t => t.id === id);

    if (!tipo) return;

    tipoEditandoId = id;

    inputEditarTipo.value = tipo.nome;

    modalEditarTipo.classList.add("ativo");
}

document.getElementById("btn-salvar-tipo").onclick = async () => {

    const nome = inputEditarTipo.value;

    if (!nome) {
        mostrarToast("Digite um nome válido", "warning");
        return;
    }

    await fetch(`/tipos/${tipoEditandoId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ nome })
    });

    mostrarToast("Tipo atualizado!", "success");

    modalEditarTipo.classList.remove("ativo");

    await renderizarTiposModal();
    await carregarTipos();
};

async function excluirTipo(id) {

    if (!confirm("Deseja excluir este tipo?")) return;

    await fetch(`/tipos/${id}`, {
        method: "DELETE",
        credentials: "include"
    });

    mostrarToast("Tipo excluído!", "success");

    await renderizarTiposModal();
    await carregarTipos();
}

document.getElementById("btn-cancelar-tipo").onclick = () => {
    modalEditarTipo.classList.remove("ativo");
};

modalEditarTipo.addEventListener("click", (e) => {
    if (e.target === modalEditarTipo) {
        modalEditarTipo.classList.remove("ativo");
    }
});

// ================= FORMAS =================

const formForma = document.getElementById("form-forma");
let formasCache = [];

formForma.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nova-forma").value;
    const permite_parcelamento = document.getElementById("permite-parcelamento").checked;
    const dia_fechamento = permite_parcelamento
        ? document.getElementById("dia-fechamento").value
        : null;

    const idEditando = formForma.dataset.editando;

    if (idEditando) {
        await fetch(`/formas-pagamento/${idEditando}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, permite_parcelamento, dia_fechamento })
        });

        mostrarToast("Forma atualizada!", "success");

    } else {
        await fetch(`/formas-pagamento`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, permite_parcelamento, dia_fechamento })
        });

        mostrarToast("Forma cadastrada!", "success");
    }

    // RESET TOTAL
    formForma.reset();
    delete formForma.dataset.editando;

    document.getElementById("grupo-fechamento").style.display = "none";

    await carregarFormasPagamento();
});

async function carregarFormasPagamento() {
    formasCache = await obterFormasPagamento();

    const selectDespesa = document.getElementById("forma-pagamento");
    const selectLimite = document.getElementById("forma-limite");

    if (selectDespesa) {
        selectDespesa.innerHTML = `<option value="" disabled selected>Forma de pagamento</option>`;
    }

    if (selectLimite) {
        selectLimite.innerHTML = `<option value="" disabled selected>Selecione a forma</option>`;
    }

    formasCache.forEach(f => {
        if (selectDespesa) {
            const opt = document.createElement("option");
            opt.value = f.id;
            opt.textContent = f.nome;
            selectDespesa.appendChild(opt);
        }

        if (selectLimite) {
            const opt = document.createElement("option");
            opt.value = f.id;
            opt.textContent = f.nome;
            selectLimite.appendChild(opt);
        }
    });

    atualizarParcelas(null);
}

// ================= LIMITES =================

async function obterLimites() {
    const res = await fetch("/limites", {
        credentials: "include"
    });

    return await res.json();
}

// ================= MODAL LIMITES =================

const btnVerLimites = document.getElementById("btn-ver-limites");
const modalLimites = document.getElementById("modal-limites");
const listaLimites = document.getElementById("lista-limites");

const modalEditarLimite = document.getElementById("modal-editar-limite");
const inputEditarValorLimite = document.getElementById("edit-limite-valor");

let limiteEditandoId = null;

if (btnVerLimites) {
    btnVerLimites.onclick = async () => {
        await renderizarLimitesModal();
        modalLimites.classList.add("ativo");
    };
}

document.getElementById("fechar-modal-limites").onclick = () => {
    modalLimites.classList.remove("ativo");
};

async function renderizarLimitesModal() {

    const limites = await obterLimites();

    listaLimites.innerHTML = "";

    limites.forEach(item => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${item.forma}</td>
            <td>${formatarMoeda(item.valor)}</td>

            <td class="acoes">
                <button onclick="editarLimite(${item.id}, ${item.valor})">✏️</button>
                <button onclick="excluirLimite(${item.id})">🗑️</button>
            </td>
        `;

        listaLimites.appendChild(tr);
    });
}

function editarLimite(id, valor) {

    limiteEditandoId = id;

    inputEditarValorLimite.value = valor;

    modalEditarLimite.classList.add("ativo");
}

document.getElementById("btn-salvar-limite").onclick = async () => {

    const valor = validarValor(inputEditarValorLimite.value);

    if (valor === null) {
        mostrarToast("Valor inválido", "warning");
        return;
    }

    await fetch(`/limites/${limiteEditandoId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ valor })
    });

    mostrarToast("Limite atualizado!", "success");

    modalEditarLimite.classList.remove("ativo");

    await renderizarLimitesModal();
    await renderizarLimites();
};

async function excluirLimite(id) {

    if (!confirm("Deseja excluir este limite?")) return;

    await fetch(`/limites/${id}`, {
        method: "DELETE",
        credentials: "include"
    });

    mostrarToast("Limite excluído!", "success");

    await renderizarLimitesModal();
    await renderizarLimites();
}

document.getElementById("btn-cancelar-limite").onclick = () => {
    modalEditarLimite.classList.remove("ativo");
};
// ================= PARCELAS =================

function atualizarParcelas(forma) {
    const grupo = document.getElementById("grupo-parcelas");
    if (!grupo) return;

    if (forma?.permite_parcelamento) {
        grupo.style.display = "block";
    } else {
        grupo.style.display = "none";
    }
}

modalEditarLimite.addEventListener("click", (e) => {
    if (e.target === modalEditarLimite) {
        modalEditarLimite.classList.remove("ativo");
    }
});

const selectForma = document.getElementById("forma-pagamento");

if (selectForma) {
    selectForma.addEventListener("change", () => {
        const forma = formasCache.find(f => f.id == selectForma.value);
        atualizarParcelas(forma);
    });
}

// ================= LIMITES =================

const formLimite = document.getElementById("form-limite");

if (formLimite) {
    formLimite.addEventListener("submit", async (e) => {
        e.preventDefault();

        const forma_pagamento_id = document.getElementById("forma-limite").value;
        const valor = validarValor(document.getElementById("valor-limite").value);

        if (!forma_pagamento_id || valor === null) {
            mostrarToast("Preencha corretamente!", "warning");
            return;
        }

        await fetch("http://127.0.0.1:5000/limites", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ forma_pagamento_id, valor })
        });

        formLimite.reset();
        mostrarToast("Limite salvo!", "success");
    });
}

async function renderizarLimites() {
    const container = document.getElementById("limites-container");
    const dados = await obterLimitesMensais();

    if (!container) return;

    container.innerHTML = "";

    dados.forEach(item => {
        const porcentagem = Math.min((item.gasto / item.limite) * 100, 100);

        let cor = "#4caf50";
        if (porcentagem >= 90) cor = "#f44336";
        else if (porcentagem >= 70) cor = "#ff9800";
        else if (porcentagem >= 50) cor = "#ebeb71";
        const div = document.createElement("div");

        div.innerHTML = `
            <h4>${item.forma}</h4>
            <p>${formatarMoeda(item.gasto)} / ${formatarMoeda(item.limite)} (${porcentagem.toFixed(1)}%)</p>
            <div style="background:#eee; border-radius:10px;">
                <div style="width:${porcentagem}%; background:${cor}; height:10px; border-radius:10px;"></div>
            </div>
        `;

        container.appendChild(div);
    });
}

// ================= UTIL =================

function validarValor(valorTexto) {
    if (!valorTexto) return null;
    const numero = Number(valorTexto.replace(",", "."));
    return isNaN(numero) ? null : numero;
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ================= TOAST =================

function mostrarToast(msg, tipo = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = msg;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================= EVENTOS =================

if (formReceita) {
    formReceita.addEventListener("submit", async (e) => {
        e.preventDefault();

        const descricao = document.getElementById("descricao-receita").value;
        const valor = validarValor(document.getElementById("valor-receita").value);
        const data = document.getElementById("data-receita").value;

        if (valor === null) {
            mostrarToast("Valor inválido", "warning");
            return;
        }

        await fetch("http://127.0.0.1:5000/receitas", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descricao, valor, data })
        });

        formReceita.reset();
        atualizarResumo();
    });
}

if (formDespesa) {
    formDespesa.addEventListener("submit", async (e) => {
        e.preventDefault();

        const descricao = document.getElementById("descricao-despesa").value;
        const valor = validarValor(document.getElementById("valor-despesa").value);
        const data = document.getElementById("data-despesa").value;
        const tipo_id = document.getElementById("tipo-despesa")?.value;
        const forma_pagamento_id = document.getElementById("forma-pagamento").value;
        const parcelas = document.getElementById("parcelas")?.value || 1;

        if (!tipo_id || valor === null) {
            mostrarToast("Preencha corretamente!", "warning");
            return;
        }

        await fetch("http://127.0.0.1:5000/despesas", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descricao, valor, data, tipo_id, forma_pagamento_id, parcelas})
        });

        formDespesa.reset();
        await atualizarResumo();
        await renderizarLimites();
    });
}

const checkboxParcelamento = document.getElementById("permite-parcelamento");
const grupoFechamento = document.getElementById("grupo-fechamento");

if (checkboxParcelamento) {
    checkboxParcelamento.addEventListener("change", () => {
        if (checkboxParcelamento.checked) {
            grupoFechamento.style.display = "block";
        } else {
            grupoFechamento.style.display = "none";
        }
    });
}

// ================= GRÁFICOS =================
async function carregarResumo() {
    const mes = document.getElementById("filtro-mes-resumo").value || "";
    const url = mes ? `?mes=${mes}` : "";

    const dados = await fetch(`/grafico/resumo${url}`).then(r => r.json());

    renderChart("graficoResumo", "pie",
        ["Receitas", "Despesas"],
        [dados.receitas, dados.despesas]
    );
}

async function carregarMensal() {
    const ano = document.getElementById("filtro-ano-mensal").value || "";
    const url = ano ? `?ano=${ano}` : "";

    const dados = await fetch(`/grafico/despesas-mensais${url}`).then(r => r.json());

    renderChart("graficoMensal", "bar",
        dados.meses.map(m => `Mês ${m}`),
        dados.valores
    );
}

async function carregarTipo() {
    const mes = document.getElementById("filtro-mes-tipo").value || "";
    const url = mes ? `?mes=${mes}` : "";

    const dados = await fetch(`/grafico/por-tipo${url}`).then(r => r.json());

    renderChart("graficoTipo", "pie",
        dados.labels,
        dados.valores
    );
}

async function carregarForma() {
    const mes = document.getElementById("filtro-mes-forma").value || "";
    const url = mes ? `?mes=${mes}` : "";

    const dados = await fetch(`/grafico/por-forma${url}`).then(r => r.json());

    renderChart("graficoForma", "pie",
        dados.labels,
        dados.valores
    );
}

function limparFiltro(tipo) {

    if (tipo === "resumo") {
        document.getElementById("filtro-mes-resumo").value = "";
        carregarResumo();
    }

    if (tipo === "mensal") {
        document.getElementById("filtro-ano-mensal").value = "";
        carregarMensal();
    }

    if (tipo === "tipo") {
        document.getElementById("filtro-mes-tipo").value = "";
        carregarTipo();
    }

    if (tipo === "forma") {
        document.getElementById("filtro-mes-forma").value = "";
        carregarForma();
    }
}

document.getElementById("filtro-mes-resumo").addEventListener("change", carregarResumo);
document.getElementById("filtro-ano-mensal").addEventListener("change", carregarMensal);
document.getElementById("filtro-mes-tipo").addEventListener("change", carregarTipo);
document.getElementById("filtro-mes-forma").addEventListener("change", carregarForma);

const charts = {}; // guarda instâncias para não duplicar

function renderChart(id, tipo, labels, dados) {
    const ctx = document.getElementById(id);

    if (!ctx) return;

    // Destrói gráfico anterior
    if (charts[id]) {
        charts[id].destroy();
    }

    // Paleta Fluxy
    const cores = [
        '#f8c8dc', // rosa pastel
        '#f7d774', // amarelo
        '#b8e0c1', // verde pastel
        '#cdb4db', // lilás
        '#a0c4ff', // azul pastel
        '#ffd6a5', // pêssego
        '#ffb4a2', // coral claro
        '#bde0fe'  // azul bebê
    ];

    const bordas = [
        '#f4a9c5',
        '#f4c542',
        '#8fc9a3',
        '#b497d6',
        '#7fb3ff',
        '#ffbe7a',
        '#ff9b85',
        '#93c5fd'
    ];

    charts[id] = new Chart(ctx, {
        type: tipo,

        data: {
            labels: labels,

            datasets: [{
                label: "Valores",
                data: dados,

                backgroundColor: cores,
                borderColor: bordas,
                borderWidth: 2,

                borderRadius: tipo === "bar" ? 10 : 0
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    labels: {
                        color: '#6b4c1e',
                        font: {
                            size: 13
                        }
                    }
                }
            },

            scales: tipo === "bar" ? {
                y: {
                    ticks: {
                        color: '#6b4c1e'
                    },
                    grid: {
                        color: '#f3e6d0'
                    }
                },

                x: {
                    ticks: {
                        color: '#6b4c1e'
                    },
                    grid: {
                        display: false
                    }
                }
            } : {}
        }
    });
}

// ================= FATURAS =================

async function carregarFaturas() {
    const dados = await fetch("/faturas").then(r => r.json());

    document.getElementById("limite-usado").textContent =
        formatarMoeda(dados.limite_usado);

    document.getElementById("fatura-atual").textContent =
        formatarMoeda(dados.fatura_atual);

    document.getElementById("proxima-fatura").textContent =
        formatarMoeda(dados.proxima_fatura);
}

async function carregarDetalhesFatura() {
    const dados = await fetch("/faturas/detalhes").then(r => r.json());

    const container = document.getElementById("lista-fatura");

    if (!container) return;

    container.innerHTML = "";

    if (dados.length === 0) {
        container.innerHTML = "<p>Nenhuma compra na fatura atual.</p>";
        return;
    }

    dados.forEach(item => {
        const div = document.createElement("div");

        div.classList.add("item-fatura");

        div.innerHTML = `
            <div>
                <strong>${item.descricao}</strong>
                <small>${item.forma} • ${item.data}</small>
            </div>
            <span>${formatarMoeda(item.valor)}</span>
        `;

        container.appendChild(div);
    });
}

async function abrirProximaFatura() {
    const res = await fetch("/faturas/proximas");
    const dados = await res.json();

    const lista = document.getElementById("lista-proxima-fatura");
    lista.innerHTML = "";

    dados.proxima.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${item.descricao} 
            <span>${formatarMoeda(item.valor)}</span>
        `;
        lista.appendChild(li);
    });

    document.getElementById("modal-proxima").classList.add("ativo");

    window.futuroFaturas = dados.futuro;
}

async function abrirOutrasFaturas() {
    const res = await fetch("/faturas/futuro");
    const dados = await res.json();

    const container = document.getElementById("lista-futuro");
    container.innerHTML = "";

    Object.keys(dados).forEach(mes => {

        const titulo = document.createElement("h4");

        const [ano, mesNum] = mes.split("-");
        const data = new Date(ano, mesNum - 1);

        titulo.innerText = data.toLocaleString("pt-BR", {
            month: "long",
            year: "numeric"
        });

        container.appendChild(titulo);

        dados[mes].forEach(item => {
            const li = document.createElement("li");
            li.innerText = `${item.descricao} - R$ ${item.valor.toFixed(2)}`;
            container.appendChild(li);
        });
    });

    document.getElementById("modal-futuro").classList.add("ativo");
}

function fecharModal(id) {
    document.getElementById(id).classList.remove("ativo");
}
// ================= INIT =================

async function init() {
    await atualizarResumo();
    await carregarTipos();
    await carregarFormasPagamento();
    await renderizarLimites();
}

init();