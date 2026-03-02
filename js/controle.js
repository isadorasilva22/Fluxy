// Carregar dados do localStorage ou iniciar vazio
let receitas = JSON.parse(localStorage.getItem("receitas")) || [];
let despesas = JSON.parse(localStorage.getItem("despesas")) || [];

// Selecionar elementos
const totalReceitasEl = document.getElementById("total-receitas");
const totalDespesasEl = document.getElementById("total-despesas");
const saldoEl = document.getElementById("saldo");

const formReceita = document.getElementById("form-receita");
const formDespesa = document.getElementById("form-despesa");

// Atualizar resumo
function atualizarResumo() {
    const totalReceitas = receitas.reduce((acc, item) => acc + item.valor, 0);
    const totalDespesas = despesas.reduce((acc, item) => acc + item.valor, 0);
    const saldo = totalReceitas - totalDespesas;

    totalReceitasEl.textContent = formatarMoeda(totalReceitas);
    totalDespesasEl.textContent = formatarMoeda(totalDespesas);
    saldoEl.textContent = formatarMoeda(saldo);

    localStorage.setItem("receitas", JSON.stringify(receitas));
    localStorage.setItem("despesas", JSON.stringify(despesas));
}

// Formatar moeda
function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Evento adicionar receita
formReceita.addEventListener("submit", function(e) {
    e.preventDefault();

    const descricao = document.getElementById("descricao-receita").value;
    const valor = parseFloat(document.getElementById("valor-receita").value);

    receitas.push({ descricao, valor });

    formReceita.reset();
    atualizarResumo();
});

// Evento adicionar despesa
formDespesa.addEventListener("submit", function(e) {
    e.preventDefault();

    const descricao = document.getElementById("descricao-despesa").value;
    const valor = parseFloat(document.getElementById("valor-despesa").value);
    const data = document.getElementById("data-despesa").value;

    despesas.push({ descricao, valor, data });

    formDespesa.reset();
    atualizarResumo();
});

// Atualizar ao carregar página
atualizarResumo();