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

// ================= ABAS =================

function trocarAba(aba, botao) {
    document.querySelectorAll(".aba-conteudo").forEach(el => {
        el.classList.remove("ativa");
    });

    document.querySelectorAll(".aba-btn").forEach(btn => {
        btn.classList.remove("ativa");
    });

    document.getElementById("aba-" + aba).classList.add("ativa");
    botao.classList.add("ativa");
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

// ================= TIPOS =================

const formTipo = document.getElementById("form-tipo");

formTipo.addEventListener("submit", async function(e) {
    e.preventDefault();

    const nome = document.getElementById("novo-tipo").value;

    if (!nome) {
        alert("Digite um nome válido");
        return;
    }

    await fetch("http://127.0.0.1:5000/tipos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ nome })
    });

    formTipo.reset();

    await carregarTipos();

    alert("✅ Tipo cadastrado com sucesso!");
});

async function carregarTipos() {
    const tipos = await obterTipos();

    const select = document.getElementById("tipo-despesa");

    if (!select) return; 

    select.innerHTML = `
    <option value="" disabled selected>Selecione um tipo</option>
`;

    tipos.forEach(tipo => {
        const option = document.createElement("option");
        option.value = tipo.id;
        option.textContent = tipo.nome;
        select.appendChild(option);
    });
}

// ================= FORMAS DE PAGAMENTO =================

const formForma = document.getElementById("form-forma");

if (formForma) {
    formForma.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("nova-forma").value;

        if (!nome) {
            alert("Digite um nome válido");
            return;
        }

        if (formas.some(f => f.nome.toLowerCase() === nome.toLowerCase())) {
            alert("Essa forma já existe");
            return;
        }

        await fetch("http://127.0.0.1:5000/formas-pagamento", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nome })
        });

        formForma.reset();
        await carregarFormasPagamento();

        alert("✅ Forma de pagamento cadastrada!");
    });
}

async function carregarFormasPagamento() {
    const formas = await obterFormasPagamento();

    const selectDespesa = document.getElementById("forma-pagamento");
    const selectLimite = document.getElementById("forma-limite");

    // mantém comportamento atual
    if (selectDespesa) {
        selectDespesa.innerHTML = `
            <option value="" disabled selected>Forma de pagamento</option>
        `;
    }

    // novo select (limites)
    if (selectLimite) {
        selectLimite.innerHTML = `
            <option value="" disabled selected>Selecione a forma</option>
        `;
    }

    formas.forEach(f => {

        // não muda nada aqui
        if (selectDespesa) {
            const opt1 = document.createElement("option");
            opt1.value = f.id;
            opt1.textContent = f.nome;
            selectDespesa.appendChild(opt1);
        }

        // novo comportamento
        if (selectLimite) {
            const opt2 = document.createElement("option");
            opt2.value = f.id;
            opt2.textContent = f.nome;
            selectLimite.appendChild(opt2);
        }

    });
}

// ================= LIMITES =================

async function verificarLimites() {
    const resposta = await fetch("http://127.0.0.1:5000/verificar-limites");
    const alertas = await resposta.json();

    alertas.forEach(alerta => {
        alert(`⚠️ Você ultrapassou o limite de ${alerta.tipo}`);
    });
}

const formLimite = document.getElementById("form-limite");

if (formLimite) {
    formLimite.addEventListener("submit", async (e) => {
        e.preventDefault();

        const forma_pagamento_id = document.getElementById("forma-limite").value;
        const valorTexto = document.getElementById("valor-limite").value;
        const valor = validarValor(valorTexto);

        if (!forma_pagamento_id) {
            alert("Selecione uma forma");
            return;
        }

        if (valor === null) {
            alert("Digite um valor válido");
            return;
        }

        await fetch("http://127.0.0.1:5000/limites", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                forma_pagamento_id,
                valor
            })
        });

        formLimite.reset();
        alert("✅ Limite salvo!");
    });
}

// ================= UTIL =================

function validarValor(valorTexto) {
    if (!valorTexto) return null;

    const valorNormalizado = valorTexto.replace(",", ".");
    const numero = Number(valorNormalizado);

    return isNaN(numero) ? null : numero;
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ================= EVENTOS =================

// Receita
formReceita.addEventListener("submit", async function(e) {
    e.preventDefault();

    const descricao = document.getElementById("descricao-receita").value;
    const valorTexto = document.getElementById("valor-receita").value;
    const valor = validarValor(valorTexto);

    if (valor === null) {
        alert("Digite um valor numérico válido");
        return;
    }

    const data = document.getElementById("data-receita").value;

    await fetch("http://127.0.0.1:5000/receitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao, valor, data })
    });

    formReceita.reset();
    atualizarResumo();
});

// Despesa 

formDespesa.addEventListener("submit", async function(e) {
    e.preventDefault();

    const descricao = document.getElementById("descricao-despesa").value;
    const valorTexto = document.getElementById("valor-despesa").value;
    const valor = validarValor(valorTexto);

    if (valor === null) {
        alert("Digite um valor numérico válido");
        return;
    }

    const forma_pagamento_id = document.getElementById("forma-pagamento").value;
    const data = document.getElementById("data-despesa").value;
    const tipo_id = document.getElementById("tipo-despesa")?.value;
    
    if (!tipo_id) {
        alert("Selecione um tipo de despesa");
        return;
    }

    await fetch("http://127.0.0.1:5000/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao, valor, data, tipo_id, forma_pagamento_id })
    });

    formDespesa.reset();
    atualizarResumo();
    verificarLimites(); // 🔥 ALERTA AQUI
});

// ================= INIT =================

async function init() {
    await atualizarResumo();
    await carregarTipos();
    await carregarFormasPagamento();
}

init();