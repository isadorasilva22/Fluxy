// ================= MODAL =================

const modal = document.getElementById("modal-editar");
const editDescricao = document.getElementById("edit-descricao");
const editValor = document.getElementById("edit-valor");
const editData = document.getElementById("edit-data");

const btnSalvar = document.getElementById("btn-salvar");
const btnCancelar = document.getElementById("btn-cancelar");

let registroAtual = null;
let tipoAtual = null;

// ================= DADOS =================

async function obterReceitas() {
    const resposta = await fetch("http://127.0.0.1:5000/receitas");
    return await resposta.json();
}

async function obterDespesas() {
    const resposta = await fetch("http://127.0.0.1:5000/despesas");
    return await resposta.json();
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

async function carregarRegistros(animar = false) {

    listaReceitas.innerHTML = "";
    listaDespesas.innerHTML = "";

    const receitas = await obterReceitas();
    const despesas = await obterDespesas();
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

        <td>
        <i class="fa-solid fa-pen-to-square icon editar" onclick="editarReceita(${receita.id})"></i>
        <i class="fa-solid fa-trash icon excluir" onclick="excluirReceita(${receita.id})"></i>
        </td>
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
        <td></td>
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
        <td class="valor-positivo">${formatarMoeda(despesa.valor)}</td>

        <td>
        <i class="fa-solid fa-pen-to-square icon editar" onclick="editarDespesa(${despesa.id})"></i>
        <i class="fa-solid fa-trash icon excluir" onclick="excluirDespesa(${despesa.id})"></i>
        </td>
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
            <td></td>
        `;

        listaDespesas.appendChild(trTotalDespesa);
    }

    // ===== ANIMAÇÃO =====
    if (animar) {
        animarTabela(tabelaReceitas);
        animarTabela(tabelaDespesas);
    }
}

// ============ AÇÕES RECEITAS ================== //

async function excluirReceita(id) {

    if (!confirm("Deseja excluir este registro?")) return;

    const response = await fetch(`/receitas/${id}`, {
        method: "DELETE"
    });

    if (response.ok) {
        carregarRegistros(true);
    } else {
        alert("Erro ao excluir registro");
    }
}


async function editarReceita(id) {

    const receitas = await obterReceitas();
    const receita = receitas.find(r => r.id === id);

    registroAtual = id;
    tipoAtual = "receita";

    editDescricao.value = receita.descricao;
    editValor.value = receita.valor;
    editData.value = receita.data || "";

    modal.style.display = "flex";
}

// ============ AÇÕES DESPESAS ================== //

async function excluirDespesa(id) {

    if (!confirm("Deseja excluir este registro?")) return;

    const response = await fetch(`/despesas/${id}`, {
        method: "DELETE"
    });

    if (response.ok) {
        carregarRegistros(true);
    } else {
        alert("Erro ao excluir registro");
    }
}

async function editarDespesa(id) {

    const despesas = await obterDespesas();
    const despesa = despesas.find(d => d.id === id);

    registroAtual = id;
    tipoAtual = "despesa";

    editDescricao.value = despesa.descricao;
    editValor.value = despesa.valor;
    editData.value = despesa.data || "";

    modal.style.display = "flex";
}

// ================= MODAL =================

btnSalvar.onclick = async () => {

    const dados = {
        descricao: editDescricao.value,
        valor: editValor.value,
        data: editData.value
    };

    if (tipoAtual === "receita") {
        await fetch(`/receitas/${registroAtual}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });
    }

    if (tipoAtual === "despesa") {
        await fetch(`/despesas/${registroAtual}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });
    }

    modal.style.display = "none";
    carregarRegistros(true);
};

btnCancelar.onclick = () => {
    modal.style.display = "none";
};

// ================= INICIALIZAÇÃO =================

carregarRegistros(true);