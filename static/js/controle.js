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
        mostrarToast("Digite um nome válido", "warning");
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

    mostrarToast("Tipo cadastrado com sucesso!", "success");
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
            mostrarToast("Digite um nome válido", "warning");
            return;
        }

        if (formas.some(f => f.nome.toLowerCase() === nome.toLowerCase())) {
            mostrarToast("Forma de pagamento já cadastrada!", "error");
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

        mostrarToast("Forma de pagamento cadastrada!", "success");

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
        mostrarToast(`⚠️ Você ultrapassou o limite de ${alerta.tipo}`, "warning");
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
            mostrarToast("Selecione uma forma de pagamento", "warning");
            return;
        }

        if (valor === null) {
            mostrarToast("Digite um valor válido", "warning");
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
        mostrarToast("Limite salvo!", "success");
    });
}

async function mostrarLimites() {
    const dados = await obterLimitesMensais();

    dados.forEach(item => {
        const porcentagem = (item.gasto / item.limite) * 100;

        console.log(`
${item.forma}
Limite: ${formatarMoeda(item.limite)}
Gasto: ${formatarMoeda(item.gasto)}
Disponível: ${formatarMoeda(item.disponivel)}
Uso: ${porcentagem.toFixed(1)}%
        `);

        if (item.gasto > item.limite) {
            mostrarToast(`⚠️ Você ultrapassou o limite de ${item.forma}`, "warning");
        }
    });
}

async function renderizarLimites() {
    const container = document.getElementById("limites-container");
    const dados = await obterLimitesMensais();

    container.innerHTML = "";

    dados.forEach(item => {
        const porcentagem = Math.min((item.gasto / item.limite) * 100, 100);
            let cor = "#4caf50";
                if (porcentagem >= 90) {
                    cor = "#f44336";
                } else if (porcentagem >= 70) {
                    cor = "#ff9800";
                }
        const div = document.createElement("div");

        div.innerHTML = `
            <h4>${item.forma}</h4>
            <p>${formatarMoeda(item.gasto)} / ${formatarMoeda(item.limite)}
            (${porcentagem.toFixed(1)}%)
            </p>
            <div style="background:#eee; border-radius:10px;">
                <div style="
                    width:${porcentagem}%;
                    background:${cor};
                    height:10px;
                    border-radius:10px;
                "></div>
            </div>
        `;

        container.appendChild(div);
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
        mostrarToast("Digite um valor numérico válido", "warning");
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
        mostrarToast("Digite um valor numérico válido", "warning");
        return;
    }

    const forma_pagamento_id = document.getElementById("forma-pagamento").value;
    const data = document.getElementById("data-despesa").value;
    const tipo_id = document.getElementById("tipo-despesa")?.value;
    
    if (!tipo_id) {
        mostrarToast("Selecione um tipo de despesa!", "warning");
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
    verificarLimites();
});

// ================= NOTIFICAÇÕES =================

function mostrarToast(mensagem, tipo = "success") {
    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
// ================= INIT =================

async function init() {
    await atualizarResumo();
    await carregarTipos();
    await carregarFormasPagamento();
    await renderizarLimites();
}

init();