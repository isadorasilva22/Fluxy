// ================= API =================

async function obterReceitas() {
    const resposta = await fetch("http://127.0.0.1:5000/receitas");
    return await resposta.json();
}

async function obterDespesas() {
    const resposta = await fetch("http://127.0.0.1:5000/despesas");
    return await resposta.json();
}

async function obterTipos() {
    const resposta = await fetch("http://127.0.0.1:5000/tipos");
    return await resposta.json();
}

async function obterFormasPagamento() {
    const res = await fetch("http://127.0.0.1:5000/formas-pagamento");
    return await res.json();
}

async function obterLimitesMensais() {
    const res = await fetch("http://127.0.0.1:5000/limites/mensal");
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

    const totalReceitas = receitas.reduce((acc, item) => acc + Number(item.valor), 0);
    const totalDespesas = despesas.reduce((acc, item) => acc + Number(item.valor), 0);

    const saldo = totalReceitas - totalDespesas;

    totalReceitasEl.textContent = formatarMoeda(totalReceitas);
    totalDespesasEl.textContent = formatarMoeda(totalDespesas);
    saldoEl.textContent = formatarMoeda(saldo);
}

// ================= ABAS =================

function trocarAba(nomeAba, botao) {
    // Esconde todas as abas
    const abas = document.querySelectorAll(".aba-conteudo");
    abas.forEach(aba => aba.classList.remove("ativa"));

    // Remove ativo dos botões
    const botoes = document.querySelectorAll(".aba-btn");
    botoes.forEach(btn => btn.classList.remove("ativa"));

    // Mostra a aba selecionada
    const abaSelecionada = document.getElementById(`aba-${nomeAba}`);
    if (abaSelecionada) {
        abaSelecionada.classList.add("ativa");
    }

    // Ativa o botão clicado
    if (botao) {
        botao.classList.add("ativa");
    }
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

// ================= FORMAS =================

const formForma = document.getElementById("form-forma");
let formasCache = [];

if (formForma) {
    formForma.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("nova-forma").value;
        const permite_parcelamento = document.getElementById("permite-parcelamento").checked;

        if (!nome) {
            mostrarToast("Digite um nome válido", "warning");
            return;
        }

        if (formasCache.some(f => f.nome.toLowerCase() === nome.toLowerCase())) {
            mostrarToast("Forma já cadastrada!", "error");
            return;
        }

        await fetch("http://127.0.0.1:5000/formas-pagamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, permite_parcelamento })
        });

        formForma.reset();
        await carregarFormasPagamento();

        mostrarToast("Forma cadastrada!", "success");
    });
}

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

        if (!tipo_id || valor === null) {
            mostrarToast("Preencha corretamente!", "warning");
            return;
        }

        await fetch("http://127.0.0.1:5000/despesas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descricao, valor, data, tipo_id, forma_pagamento_id })
        });

        formDespesa.reset();
        await atualizarResumo();
        await renderizarLimites();
    });
}

// ================= INIT =================

async function init() {
    await atualizarResumo();
    await carregarTipos();
    await carregarFormasPagamento();
    await renderizarLimites();
}

init();