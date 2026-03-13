// Carregar dados da API
async function obterReceitas() {
    const resposta = await fetch("http://127.0.0.1:5000/receitas");
    return await resposta.json();
}

async function obterDespesas() {
    const resposta = await fetch("http://127.0.0.1:5000/despesas");
    return await resposta.json();
}

// Selecionar elementos
const totalReceitasEl = document.getElementById("total-receitas");
const totalDespesasEl = document.getElementById("total-despesas");
const saldoEl = document.getElementById("saldo");

const formReceita = document.getElementById("form-receita");
const formDespesa = document.getElementById("form-despesa");

// Atualizar resumo
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

// Formatar moeda
function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Evento adicionar receita
formReceita.addEventListener("submit", async function(e) {
    e.preventDefault();

    const descricao = document.getElementById("descricao-receita").value;
    const valor = parseFloat(document.getElementById("valor-receita").value);
    const data = document.getElementById("data-receita").value;

    await fetch("http://127.0.0.1:5000/receitas", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ descricao, valor, data })
    });

    formReceita.reset();
    atualizarResumo();
});

// Evento adicionar despesa
formDespesa.addEventListener("submit", async function(e) {
    e.preventDefault();

    const descricao = document.getElementById("descricao-despesa").value;
    const valor = parseFloat(document.getElementById("valor-despesa").value);
    const data = document.getElementById("data-despesa").value;

    await fetch("http://127.0.0.1:5000/despesas", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ descricao, valor, data })
    });

    formDespesa.reset();
    atualizarResumo();
});

// Atualizar ao carregar página
atualizarResumo();