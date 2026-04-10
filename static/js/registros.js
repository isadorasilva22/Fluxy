// ================= VARIÁVEIS =================

const modal = document.getElementById("modal-editar");
const editDescricao = document.getElementById("edit-descricao");
const editFormaPagamento = document.getElementById("edit-forma-pagamento");
const editGrupoParcelas = document.getElementById("edit-grupo-parcelas");
const editValor = document.getElementById("edit-valor");
const editData = document.getElementById("edit-data");
const filtroTipo = document.getElementById("filtro-tipo");

const modalReceita = document.getElementById("modal-editar-receita");
const editReceitaDescricao = document.getElementById("edit-receita-descricao");
const editReceitaValor = document.getElementById("edit-receita-valor");
const editReceitaData = document.getElementById("edit-receita-data");

const btnSalvarReceita = document.getElementById("btn-salvar-receita");
const btnCancelarReceita = document.getElementById("btn-cancelar-receita");

const btnSalvar = document.getElementById("btn-salvar");
const btnCancelar = document.getElementById("btn-cancelar");

let registroAtual = null;
let tipoAtual = null;

let ordenacaoReceitas = {
    campo: null,
    direcao: "asc"
};

let ordenacaoDespesas = {
    campo: null,
    direcao: "asc"
};

// ================= ORDENAÇÃO =================

document.querySelectorAll("th[data-campo]").forEach(th => {
    th.addEventListener("click", () => {

        const campo = th.dataset.campo;
        const tabela = th.closest("table").id;

        let ordenacaoAtual;

        if (tabela === "tabela-receitas") {
            ordenacaoAtual = ordenacaoReceitas;
        } else {
            ordenacaoAtual = ordenacaoDespesas;
        }

        if (ordenacaoAtual.campo === campo) {
            ordenacaoAtual.direcao = ordenacaoAtual.direcao === "asc" ? "desc" : "asc";
        } else {
            ordenacaoAtual.campo = campo;
            ordenacaoAtual.direcao = "asc";
        }

        atualizarSetas();
        carregarRegistros(true);
    });
});

function ordenarLista(lista, ordenacao) {
    if (!ordenacao.campo || !lista) return lista || [];

    return [...lista].sort((a, b) => {

        let valA = a[ordenacao.campo];
        let valB = b[ordenacao.campo];

        // trata null/undefined
        valA = valA ?? "";
        valB = valB ?? "";

        if (ordenacao.campo === "data") {
            const dA = new Date(valA);
            const dB = new Date(valB);

            return ordenacao.direcao === "asc" ? dA - dB : dB - dA;
        }

        if (ordenacao.campo === "valor") {
            return ordenacao.direcao === "asc"
                ? Number(valA) - Number(valB)
                : Number(valB) - Number(valA);
        }

        return ordenacao.direcao === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
    });
}

function atualizarSetas() {
    document.querySelectorAll("th[data-campo]").forEach(th => {
        th.innerHTML = th.dataset.label;
    });

    document.querySelectorAll("#tabela-receitas th[data-campo]").forEach(th => {
        if (th.dataset.campo === ordenacaoReceitas.campo) {
            th.innerHTML += ordenacaoReceitas.direcao === "asc" ? " ↑" : " ↓";
        }
    });

    document.querySelectorAll("#tabela-despesas th[data-campo]").forEach(th => {
        if (th.dataset.campo === ordenacaoDespesas.campo) {
            th.innerHTML += ordenacaoDespesas.direcao === "asc" ? " ↑" : " ↓";
        }
    });
}

// ================= DADOS =================

async function obterReceitas() {
    const resposta = await fetch("http://127.0.0.1:5000/receitas");
    return await resposta.json();
}

async function obterDespesas() {
    const resposta = await fetch("http://127.0.0.1:5000/despesas");
    return await resposta.json();
}

async function obterTipos() {
    const res = await fetch("http://127.0.0.1:5000/tipos");
    return await res.json();
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
        filtroTipo.value = "";
        carregarRegistros(true);
    });
}

async function carregarFiltroTipos() {
    const tipos = await obterTipos();

    if (!filtroTipo) return;

    filtroTipo.innerHTML = `<option value="">Todos os tipos</option>`;

    tipos.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.nome;
        filtroTipo.appendChild(opt);
    });
}

if (filtroTipo) {
    filtroTipo.addEventListener("change", () => {
        carregarRegistros(true);
    });
}

// ================= RENDERIZAÇÃO =================

async function carregarRegistros(animar = false) {

    listaReceitas.innerHTML = "";
    listaDespesas.innerHTML = "";

    let receitas = await obterReceitas();
    let despesas = await obterDespesas();

    // aplica ordenação AQUI (depois de buscar)
    receitas = ordenarLista(receitas, ordenacaoReceitas);
    despesas = ordenarLista(despesas, ordenacaoDespesas);
    const mesSelecionado = filtroMes ? filtroMes.value : "";
    const tipoSelecionado = filtroTipo ? filtroTipo.value: "";

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

    if (tipoSelecionado) {
        if (despesa.tipo_id != tipoSelecionado) {
            return;
        }
    }

    contadorDespesas++;

    const tr = document.createElement("tr");

        tr.innerHTML = `
        <td>${formatarData(despesa.data)}</td>
        <td>${despesa.descricao}</td>
        <td>${despesa.tipo || "-"}</td>
        <td>${despesa.forma || "-"}</td>
        <td class="valor-negativo">${formatarMoeda(despesa.valor)}</td>

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
            <td colspan="4">Total</td>
            <td class="total-negativo">${formatarMoeda(totalDespesas)}</td>
            <td></td>
            <td></td>
        `;

        listaDespesas.appendChild(trTotalDespesa);
    }

    // ===== ANIMAÇÃO =====
    if (animar) {
        animarTabelas();
    }
}

// ============ FOMRAS PAGAMENTO ================== //

let formasCache = [];

async function obterFormasPagamento() {
    const res = await fetch("http://127.0.0.1:5000/formas-pagamento");
    return await res.json();
}

async function carregarFormasModal() {
    formasCache = await obterFormasPagamento();

    if (!editFormaPagamento) return;

    editFormaPagamento.innerHTML = `<option value="">Selecione</option>`;

    formasCache.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.nome;
        editFormaPagamento.appendChild(opt);
    });
}

if (editFormaPagamento) {
    editFormaPagamento.addEventListener("change", () => {
        const forma = formasCache.find(f => f.id == editFormaPagamento.value);
        atualizarParcelasModal(forma);
    });
}

function atualizarParcelasModal(forma) {
    if (!editGrupoParcelas) return;

    editGrupoParcelas.style.display =
        forma?.permite_parcelamento ? "block" : "none";
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

    editReceitaDescricao.value = receita.descricao;
    editReceitaValor.value = receita.valor;
    editReceitaData.value = receita.data || "";

    modalReceita.style.display = "flex";
}

btnSalvarReceita.onclick = async () => {

    const dados = {
        descricao: editReceitaDescricao.value,
        valor: editReceitaValor.value,
        data: editReceitaData.value
    };

    const response = await fetch(`/receitas/${registroAtual}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });

    if (!response.ok) {
        alert("Erro ao atualizar receita");
        return;
    }

    modalReceita.style.display = "none";
    carregarRegistros(true);
};

btnCancelarReceita.onclick = () => {
    modalReceita.style.display = "none";
};

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

async function carregarTiposModal() {
    const tipos = await obterTipos();
    const select = document.getElementById("edit-tipo-despesa");

    if (!select) return;

    select.innerHTML = `<option value="">Selecione</option>`;

    tipos.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.nome;
        select.appendChild(opt);
    });
}

async function editarDespesa(id) {

    const despesas = await obterDespesas();
    const despesa = despesas.find(d => d.id === id);

    registroAtual = id;
    tipoAtual = "despesa";

    editDescricao.value = despesa.descricao;
    editValor.value = despesa.valor;
    editData.value = despesa.data || "";

    await carregarFormasModal();
    await carregarTiposModal();

    editFormaPagamento.value = "";
    document.getElementById("edit-tipo-despesa").value = despesa.tipo_id || "";
    editGrupoParcelas.style.display = "none";

    editFormaPagamento.style.display = "block";

    if (despesa.forma_pagamento_id) {
        editFormaPagamento.value = despesa.forma_pagamento_id;

        const forma = formasCache.find(f => f.id == despesa.forma_pagamento_id);
        atualizarParcelasModal(forma);

    } else if (despesa.forma){
        const forma = formasCache.find(f => f.nome === despesa.forma);

        if (forma) {
            editFormaPagamento.value = forma.id;
            atualizarParcelasModal(forma);
        }
    }

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

        dados.forma_pagamento_id = editFormaPagamento.value 
            ? Number(editFormaPagamento.value) 
            : null;
        const tipoSelect = document.getElementById("edit-tipo-despesa");
        dados.tipo_id = tipoSelect.value ? Number(tipoSelect.value) : null;

        const response = await fetch(`/despesas/${registroAtual}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (!response.ok) {
            console.error("Erro ao atualizar despesa");
            alert("Erro ao salvar. Veja o console.");
            return;
        }
            }

    modal.style.display = "none";
    carregarRegistros(true);
};

btnCancelar.onclick = () => {
    modal.style.display = "none";
};

// ================= INICIALIZAÇÃO =================

carregarRegistros(true);
carregarFiltroTipos();