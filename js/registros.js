// ================= DADOS =================

function obterReceitas() {
    return JSON.parse(localStorage.getItem("receitas")) || [];
}

function obterDespesas() {
    return JSON.parse(localStorage.getItem("despesas")) || [];
}

// ================= ELEMENTOS =================

const listaReceitas = document.getElementById("lista-receitas");
const listaDespesas = document.getElementById("lista-despesas");
const filtroMes = document.getElementById("filtro-mes");
const btnLimpar = document.getElementById("btn-limpar");

const tabelaReceitas = document.querySelector("#tabela-receitas");
const tabelaDespesas = document.querySelector("#tabela-despesas");

// ================= FORMATADORES =================

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(dataISO) {

    if (!dataISO) {
        return `<span class="badge-sem-data">Sem data</span>`;
    }

     const partes = dataISO.split("-");

    if (partes.length !== 3) {
        return `<span class="badge-sem-data">Sem data</span>`;
    }

    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}/${mes}/${ano}`;
}

// ================= ANIMAÇÃO =================

function animarTabelas() {
    const tabelas = document.querySelectorAll(".tabela-animada");

    tabelas.forEach(tabela => {
        tabela.classList.remove("mostrar");

        // força reinício da animação
        void tabela.offsetWidth;

        tabela.classList.add("mostrar");
    });
}

// ================= FILTRO =================

if (filtroMes) {
    filtroMes.addEventListener("change", () => {
        carregarRegistros(true);
    });
}

if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
        filtroMes.value = "";
        carregarRegistros(true);
    });
}

// ================= RENDERIZAÇÃO =================

function carregarRegistros(animar = false) {

    listaReceitas.innerHTML = "";
    listaDespesas.innerHTML = "";

    const receitas = obterReceitas();
    const despesas = obterDespesas();
    const mesSelecionado = filtroMes ? filtroMes.value : "";

    let totalReceitas = 0;
    let totalDespesas = 0;
    let contadorReceitas = 0;
    let contadorDespesas = 0;

    if (animar) {
    animarTabelas();
}

    // ===== RECEITAS =====
    receitas.forEach(receita => {

        if (mesSelecionado) {
            if (!receita.data || !receita.data.startsWith(mesSelecionado)) {
                return;
            }
        }

        contadorReceitas++;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatarData(receita.data)}</td>
            <td>${receita.descricao}</td>
            <td class="valor-positivo">${formatarMoeda(receita.valor)}</td>
        `;

        listaReceitas.appendChild(tr);
        totalReceitas += Number(receita.valor);
    });

    if (contadorReceitas === 0) {
        listaReceitas.innerHTML = `
            <tr class="linha-vazia">
                <td colspan="3">Nenhum registro encontrado</td>
            </tr>
        `;
    } else {
        const trTotalReceita = document.createElement("tr");
        trTotalReceita.classList.add("linha-total");

        trTotalReceita.innerHTML = `
            <td colspan="2">Total</td>
            <td class="total-positivo">${formatarMoeda(totalReceitas)}</td>
        `;

        listaReceitas.appendChild(trTotalReceita);
    }

    // ===== DESPESAS =====
    despesas.forEach(despesa => {

        if (mesSelecionado) {
            if (!despesa.data || !despesa.data.startsWith(mesSelecionado)) {
                return;
            }
        }

        contadorDespesas++;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatarData(despesa.data)}</td>
            <td>${despesa.descricao}</td>
            <td class="valor-negativo">${formatarMoeda(despesa.valor)}</td>
        `;

        listaDespesas.appendChild(tr);
        totalDespesas += Number(despesa.valor);
    });

    if (contadorDespesas === 0) {
        listaDespesas.innerHTML = `
            <tr class="linha-vazia">
                <td colspan="3">Nenhum registro encontrado</td>
            </tr>
        `;
    } else {
        const trTotalDespesa = document.createElement("tr");
        trTotalDespesa.classList.add("linha-total");

        trTotalDespesa.innerHTML = `
            <td colspan="2">Total</td>
            <td class="total-negativo">${formatarMoeda(totalDespesas)}</td>
        `;

        listaDespesas.appendChild(trTotalDespesa);
    }

    // ===== ANIMAÇÃO =====
    if (animar) {
        animarTabela(tabelaReceitas);
        animarTabela(tabelaDespesas);
    }
}

// ================= INICIALIZAÇÃO =================

carregarRegistros(true);