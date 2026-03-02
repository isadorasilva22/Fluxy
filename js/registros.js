const receitas = JSON.parse(localStorage.getItem("receitas")) || [];
const despesas = JSON.parse(localStorage.getItem("despesas")) || [];

const listaReceitas = document.getElementById("lista-receitas");
const listaDespesas = document.getElementById("lista-despesas");

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Renderizar receitas
receitas.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.descricao} - ${formatarMoeda(item.valor)}`;
    listaReceitas.appendChild(li);
});

// Renderizar despesas
despesas.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.descricao} - ${formatarMoeda(item.valor)} (${item.data})`;
    listaDespesas.appendChild(li);
});