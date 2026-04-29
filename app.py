from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import psycopg2
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.secret_key = "fluxy_chave_super_secreta_123"
CORS(app, supports_credentials=True)

def get_conn():
    return psycopg2.connect(
        host="localhost",
        database="fluxy",
        user="postgres",
        password="sua_senha",
        port=5432
    )

# ================= AUTH =================

def get_usuario():
    return session.get("usuario_id")

def login_obrigatorio(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not get_usuario():
            return jsonify({"erro": "Usuário não autenticado"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route("/me")
def me():
    usuario_id = session.get("usuario_id")
    if not usuario_id:
        return jsonify({"logado": False}), 401
    return jsonify({"logado": True})

# ================= USUÁRIOS =================

@app.route("/usuarios", methods=["POST"])
def cadastrar_usuario():
    data = request.json or {}
    nome = data.get("nome")
    email = data.get("email")
    senha = data.get("senha")

    if not nome or not email or not senha:
        return jsonify({"erro": "Campos obrigatórios: nome, email e senha"}), 400

    senha_hash = generate_password_hash(senha)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"erro": "Email já cadastrado"}), 400

    cur.execute("""
        INSERT INTO usuarios (nome, email, senha)
        VALUES (%s, %s, %s)
        RETURNING id
    """, (nome, email, senha_hash))

    user_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    session["usuario_id"] = user_id
    return jsonify({"mensagem": "Usuário criado e logado", "id": user_id})

@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email")
    senha = data.get("senha")

    if not email or not senha:
        return jsonify({"erro": "Email e senha são obrigatórios"}), 400

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, senha FROM usuarios WHERE email=%s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    if not check_password_hash(user[1], senha):
        return jsonify({"erro": "Senha incorreta"}), 401

    session["usuario_id"] = user[0]
    return jsonify({"mensagem": "Login realizado"})

@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"mensagem": "Logout realizado"})

# ================= PÁGINAS =================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login-page")
def login_page():
    return render_template("login.html")

@app.route("/cadastro")
def cadastro_page():
    return render_template("cadastro.html")

@app.route("/controle")
@login_obrigatorio
def controle():
    return render_template("controle.html")

@app.route("/registros")
@login_obrigatorio
def registros():
    return render_template("registros.html")

# ================= RECEITAS =================

@app.route("/receitas", methods=["GET"])
@login_obrigatorio
def listar_receitas():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, descricao, valor, data
        FROM receitas
        WHERE usuario_id = %s
        ORDER BY data DESC
    """, (usuario_id,))

    receitas = [{
        "id": r[0],
        "descricao": r[1],
        "valor": float(r[2]),
        "data": str(r[3])
    } for r in cur.fetchall()]

    cur.close()
    conn.close()
    return jsonify(receitas)


@app.route("/receitas", methods=["POST"])
@login_obrigatorio
def adicionar_receita():
    usuario_id = get_usuario()

    data = request.json or {}
    descricao = data.get("descricao")
    valor = data.get("valor")
    data_receita = data.get("data")

    if not descricao or valor is None or not data_receita:
        return jsonify({"erro": "Campos obrigatórios: descricao, valor e data"}), 400

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO receitas (descricao, valor, data, usuario_id)
        VALUES (%s, %s, %s, %s)
        RETURNING id, descricao, valor, data
    """, (descricao, valor, data_receita, usuario_id))

    nova = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        "id": nova[0],
        "descricao": nova[1],
        "valor": float(nova[2]),
        "data": str(nova[3])
    })

@app.route("/receitas/<int:id>", methods=["PUT"])
@login_obrigatorio
def editar_receita(id):
    usuario_id = get_usuario()

    data = request.json or {}
    descricao = data.get("descricao")
    valor = data.get("valor")
    data_receita = data.get("data")

    if not descricao or valor is None or not data_receita:
        return jsonify({"erro": "Campos obrigatórios: descricao, valor e data"}), 400

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE receitas
        SET descricao=%s, valor=%s, data=%s
        WHERE id=%s AND usuario_id=%s
    """, (descricao, valor, data_receita, id, usuario_id))

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Receita atualizada"})

@app.route("/receitas/<int:id>", methods=["DELETE"])
@login_obrigatorio
def excluir_receita(id):
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM receitas WHERE id=%s AND usuario_id=%s", (id, usuario_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Receita excluída"})


# ================= DESPESAS =================

@app.route("/despesas", methods=["GET"])
@login_obrigatorio
def listar_despesas():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT d.id, d.descricao, d.valor, d.data,
               f.nome, t.id, t.nome
        FROM despesas d
        LEFT JOIN formas_pagamento f ON d.forma_pagamento_id = f.id
        LEFT JOIN tipos_despesa t ON d.tipo_id = t.id
        WHERE d.usuario_id = %s
        ORDER BY d.data DESC
    """, (usuario_id,))

    despesas = [{
        "id": r[0],
        "descricao": r[1],
        "valor": float(r[2]),
        "data": str(r[3]),
        "forma": r[4],
        "tipo_id": r[5],
        "tipo": r[6]
    } for r in cur.fetchall()]

    cur.close()
    conn.close()
    return jsonify(despesas)

@app.route("/despesas", methods=["POST"])
@login_obrigatorio
def adicionar_despesa():
    usuario_id = get_usuario()

    data = request.json or {}
    descricao = data.get("descricao")
    valor = data.get("valor")
    data_despesa = data.get("data")
    tipo_id = data.get("tipo_id")

    if not descricao or valor is None or not data_despesa:
        return jsonify({"erro": "Campos obrigatórios: descricao, valor e data"}), 400

    conn = get_conn()
    cur = conn.cursor()

    valor_total = float(valor)
    parcelas = int(data.get("parcelas", 1))
    valor_parcela = round(valor_total / parcelas, 2)
    data_base = datetime.strptime(data_despesa, "%Y-%m-%d")

    for i in range(parcelas):
        cur.execute("""
            INSERT INTO despesas
            (descricao, valor, data, tipo_id, forma_pagamento_id, usuario_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            f"{descricao} ({i+1}/{parcelas})",
            valor_parcela,
            data_base + relativedelta(months=i),
            tipo_id,
            data.get("forma_pagamento_id"),
            usuario_id
        ))

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Despesa criada"})

@app.route("/despesas/<int:id>", methods=["PUT"])
@login_obrigatorio
def editar_despesa(id):
    usuario_id = get_usuario()
    data = request.json or {}

    descricao = data.get("descricao")
    valor = data.get("valor")
    data_despesa = data.get("data")
    tipo_id = data.get("tipo_id")
    forma_pagamento_id = data.get("forma_pagamento_id")
    parcelas = data.get("parcelas", 1)

    conn = get_conn()
    cur = conn.cursor()
    permite = False
    resultado = None

    if forma_pagamento_id:
        cur.execute(
            "SELECT permite_parcelamento FROM formas_pagamento WHERE id=%s",
            (forma_pagamento_id,)
        )
        resultado = cur.fetchone()

    if resultado:
        permite = resultado[0]

    if not permite:
        parcelas = 1

    cur.execute("""
        UPDATE despesas
        SET descricao=%s,
            valor=%s,
            data=%s,
            tipo_id=%s,
            forma_pagamento_id=%s,
            parcelas=%s
        WHERE id=%s AND usuario_id=%s
    """, (
        descricao,
        valor,
        data_despesa,
        tipo_id,
        forma_pagamento_id,
        parcelas,
        id,
        usuario_id
    ))

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Despesa atualizada"})

@app.route("/despesas/<int:id>", methods=["DELETE"])
@login_obrigatorio
def excluir_despesa(id):
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM despesas WHERE id=%s AND usuario_id=%s", (id, usuario_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Despesa excluída"})

# TIPO DE DESPESA

@app.route("/tipos", methods=["GET"])
@login_obrigatorio
def listar_tipos():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, nome
        FROM tipos_despesa
        WHERE usuario_id = %s
    """, (usuario_id,))
    tipos = [{"id": row[0], "nome": row[1]} for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(tipos)

@app.route("/tipos", methods=["POST"])
@login_obrigatorio
def criar_tipo():
    usuario_id = get_usuario()
    data = request.json or {}
    nome = data.get("nome")

    if not nome:
        return jsonify({"erro": "Campo obrigatório: nome"}), 400

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO tipos_despesa (nome, usuario_id) VALUES (%s, %s)", (nome, usuario_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Tipo criado"})

# FORMAS DE PAGAMENTO

@app.route("/formas-pagamento", methods=["GET"])
@login_obrigatorio
def listar_formas_pagamento():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, nome, permite_parcelamento, dia_fechamento
        FROM formas_pagamento
        WHERE usuario_id = %s
        ORDER BY nome
    """, (usuario_id,))
    dados = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([
        {"id": d[0], "nome": d[1], "permite_parcelamento": d[2], "dia_fechamento": d[3]}
        for d in dados
    ])

@app.route("/formas-pagamento/<int:id>", methods=["GET"])
@login_obrigatorio
def obter_forma_pagamento(id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, nome, permite_parcelamento, dia_fechamento FROM formas_pagamento WHERE id=%s",
        (id,)
    )
    d = cur.fetchone()
    cur.close()
    conn.close()

    if not d:
        return jsonify({"erro": "Forma não encontrada"}), 404

    return jsonify({
        "id": d[0],
        "nome": d[1],
        "permite_parcelamento": d[2],
        "dia_fechamento": d[3]
    })

@app.route("/formas-pagamento", methods=["POST"])
@login_obrigatorio
def criar_forma_pagamento():
    usuario_id = get_usuario()
    data = request.json or {}

    nome = data.get("nome")
    if not nome:
        return jsonify({"erro": "Campo obrigatório: nome"}), 400

    permite_parcelamento = data.get("permite_parcelamento", False)

    if isinstance(permite_parcelamento, str):
        permite_parcelamento = permite_parcelamento.lower() in ["true", "1", "on"]

    permite_parcelamento = bool(permite_parcelamento)

    dia_fechamento = data.get("dia_fechamento")
    if dia_fechamento in ("", None):
        dia_fechamento = None
    else:
        dia_fechamento = int(dia_fechamento)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO formas_pagamento
        (nome, permite_parcelamento, dia_fechamento, usuario_id)
        VALUES (%s, %s, %s, %s)
    """, (nome, permite_parcelamento, dia_fechamento, usuario_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Forma de pagamento criada"})

@app.route("/formas-pagamento/<int:id>", methods=["PUT"])
@login_obrigatorio
def editar_forma(id):
    data = request.json or {}

    nome = data.get("nome")
    permite = data.get("permite_parcelamento")
    dia = data.get("dia_fechamento")

    if dia in ("", None):
        dia = None
    else:
        dia = int(dia)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE formas_pagamento
        SET nome=%s,
            permite_parcelamento=%s,
            dia_fechamento=%s
        WHERE id=%s
    """, (nome, permite, dia, id))

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Forma atualizada"})


@app.route("/formas-pagamento/<int:id>", methods=["DELETE"])
@login_obrigatorio
def excluir_forma(id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM formas_pagamento WHERE id=%s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"mensagem": "Forma excluída"})

# LIMITES BANCÁRIOS

@app.route("/limites/mensal", methods=["GET"])
@login_obrigatorio
def calcular_limites_mensais():
    usuario_id = get_usuario()

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT f.id, f.nome, l.valor AS limite, f.dia_fechamento
        FROM limites l
        JOIN formas_pagamento f ON f.id = l.forma_pagamento_id
        WHERE f.usuario_id = %s AND l.usuario_id = %s
    """, (usuario_id, usuario_id))

    formas = cur.fetchall()
    resposta = []
    hoje = datetime.today()

    for f in formas:
        forma_id, nome, limite, dia_fechamento = f

        if dia_fechamento is None:
            inicio = hoje.replace(day=1)
        else:
            if hoje.day > dia_fechamento:
                inicio = date(hoje.year, hoje.month, dia_fechamento) + relativedelta(days=1)
            else:
                data_mes_anterior = hoje - relativedelta(months=1)
                inicio = date(
                    data_mes_anterior.year,
                    data_mes_anterior.month,
                    dia_fechamento
                ) + relativedelta(days=1)

        fim = inicio + relativedelta(months=1)

        cur.execute("""
            SELECT COALESCE(SUM(valor), 0)
            FROM despesas
            WHERE forma_pagamento_id = %s
            AND usuario_id = %s
            AND data::date >= %s
        """, (forma_id, usuario_id, inicio))

        usado = cur.fetchone()[0]
        disponivel = float(limite) - float(usado)

        resposta.append({
            "forma": nome,
            "limite": float(limite),
            "gasto": float(usado),
            "disponivel": disponivel
        })

    cur.close()
    conn.close()

    return jsonify(resposta)

@app.route("/limites", methods=["POST"])
@login_obrigatorio
def criar_limite():
    usuario_id = get_usuario()
    data = request.json or {}

    forma_pagamento_id = data.get("forma_pagamento_id")
    valor = data.get("valor")

    if not forma_pagamento_id or valor is None:
        return jsonify({"erro": "Campos obrigatórios: forma_pagamento_id e valor"}), 400

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT id FROM formas_pagamento
        WHERE id = %s AND usuario_id = %s
    """, (forma_pagamento_id, usuario_id))

    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"erro": "Forma de pagamento inválida"}), 403

    cur.execute("""
        SELECT id FROM limites
        WHERE forma_pagamento_id = %s AND usuario_id = %s
    """, (forma_pagamento_id, usuario_id))

    existente = cur.fetchone()

    if existente:
        cur.execute("""
            UPDATE limites
            SET valor = %s
            WHERE forma_pagamento_id = %s AND usuario_id = %s
        """, (valor, forma_pagamento_id, usuario_id))
    else:
        cur.execute("""
            INSERT INTO limites (forma_pagamento_id, valor, usuario_id)
            VALUES (%s, %s, %s)
        """, (forma_pagamento_id, valor, usuario_id))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"mensagem": "Limite salvo"})

# GRÁFICOS

@app.route("/grafico/resumo")
@login_obrigatorio
def grafico_resumo():
    usuario_id = get_usuario()
    mes = request.args.get("mes")

    conn = get_conn()
    cur = conn.cursor()

    params = [usuario_id]
    filtro = "WHERE usuario_id = %s"

    if mes:
        filtro += " AND TO_CHAR(data, 'YYYY-MM') = %s"
        params.append(mes)

    cur.execute(f"SELECT COALESCE(SUM(valor),0) FROM receitas {filtro}", params)
    receitas = cur.fetchone()[0]

    cur.execute(f"SELECT COALESCE(SUM(valor),0) FROM despesas {filtro}", params)
    despesas = cur.fetchone()[0]

    cur.close()
    conn.close()

    return jsonify({
        "receitas": float(receitas),
        "despesas": float(despesas)
    })

@app.route("/grafico/despesas-mensais")
@login_obrigatorio
def grafico_mensal():
    usuario_id = get_usuario()
    ano = request.args.get("ano")

    conn = get_conn()
    cur = conn.cursor()

    if ano:
        cur.execute("""
            SELECT EXTRACT(MONTH FROM data), SUM(valor)
            FROM despesas
            WHERE usuario_id = %s AND EXTRACT(YEAR FROM data) = %s
            GROUP BY 1
            ORDER BY 1
        """, (usuario_id, ano))
    else:
        cur.execute("""
            SELECT EXTRACT(MONTH FROM data), SUM(valor)
            FROM despesas
            WHERE usuario_id = %s
            GROUP BY 1
            ORDER BY 1
        """, (usuario_id,))

    dados = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        "meses": [int(d[0]) for d in dados],
        "valores": [float(d[1]) for d in dados]
    })

@app.route("/grafico/por-tipo")
@login_obrigatorio
def grafico_tipo():
    usuario_id = get_usuario()
    mes = request.args.get("mes")

    conn = get_conn()
    cur = conn.cursor()

    params = [usuario_id]
    filtro = "WHERE d.usuario_id = %s"

    if mes:
        filtro += " AND TO_CHAR(d.data, 'YYYY-MM') = %s"
        params.append(mes)

    cur.execute(f"""
        SELECT t.nome, SUM(d.valor)
        FROM despesas d
        JOIN tipos_despesa t ON d.tipo_id = t.id
        {filtro}
        GROUP BY t.nome
    """, params)

    dados = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        "labels": [d[0] for d in dados],
        "valores": [float(d[1]) for d in dados]
    })

@app.route("/grafico/por-forma")
@login_obrigatorio
def grafico_forma():
    usuario_id = get_usuario()
    mes = request.args.get("mes")

    conn = get_conn()
    cur = conn.cursor()

    params = [usuario_id]
    filtro = "WHERE d.usuario_id = %s"

    if mes:
        filtro += " AND TO_CHAR(d.data, 'YYYY-MM') = %s"
        params.append(mes)

    cur.execute(f"""
        SELECT COALESCE(f.nome, 'Sem forma'), SUM(d.valor)
        FROM despesas d
        LEFT JOIN formas_pagamento f ON d.forma_pagamento_id = f.id
        {filtro}
        GROUP BY f.nome
    """, params)

    dados = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        "labels": [d[0] for d in dados],
        "valores": [float(d[1]) for d in dados]
    })

# FATURAS

@app.route("/faturas")
@login_obrigatorio
def calcular_faturas():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT d.valor, d.data, f.dia_fechamento
        FROM despesas d
        JOIN formas_pagamento f ON d.forma_pagamento_id = f.id
        WHERE f.dia_fechamento IS NOT NULL
        AND d.usuario_id = %s
        AND NOT EXISTS (
            SELECT 1 FROM faturas_pagas fp
            WHERE fp.forma_pagamento_id = d.forma_pagamento_id
            AND d.data BETWEEN fp.data_inicio AND fp.data_fim
        )
    """, (usuario_id,))

    dados = cur.fetchall()
    hoje = date.today()

    fatura_atual = 0
    proxima_fatura = 0
    limite_usado = 0

    for valor, data, dia_fechamento in dados:
        if hoje.day > dia_fechamento:
            inicio_atual = date(hoje.year, hoje.month, dia_fechamento) + relativedelta(days=1)
        else:
            mes_anterior = hoje - relativedelta(months=1)
            inicio_atual = date(mes_anterior.year, mes_anterior.month, dia_fechamento) + relativedelta(days=1)

        fim_atual = inicio_atual + relativedelta(months=1)
        inicio_proxima = fim_atual
        fim_proxima = inicio_proxima + relativedelta(months=1)

        if inicio_atual <= data < fim_atual:
            fatura_atual += float(valor)
        elif inicio_proxima <= data < fim_proxima:
            proxima_fatura += float(valor)

        if data >= inicio_atual:
            limite_usado += float(valor)

    cur.close()
    conn.close()
    return jsonify({
        "limite_usado": limite_usado,
        "fatura_atual": fatura_atual,
        "proxima_fatura": proxima_fatura
    })

@app.route("/faturas/detalhes")
@login_obrigatorio
def detalhes_fatura():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT d.descricao, d.valor, d.data, f.nome, f.dia_fechamento
        FROM despesas d
        JOIN formas_pagamento f ON d.forma_pagamento_id = f.id
        WHERE f.dia_fechamento IS NOT NULL
        AND d.usuario_id = %s
        ORDER BY d.data DESC
    """, (usuario_id,))

    dados = cur.fetchall()
    hoje = datetime.today()
    lista = []

    for descricao, valor, data, forma, dia_fechamento in dados:
        if hoje.day > dia_fechamento:
            inicio_atual = date(hoje.year, hoje.month, dia_fechamento) + relativedelta(days=1)
        else:
            mes_anterior = hoje - relativedelta(months=1)
            inicio_atual = date(mes_anterior.year, mes_anterior.month, dia_fechamento) + relativedelta(days=1)

        fim_atual = inicio_atual + relativedelta(months=1)

        if inicio_atual <= data < fim_atual:
            lista.append({
                "descricao": descricao,
                "valor": float(valor),
                "data": str(data),
                "forma": forma
            })

    cur.close()
    conn.close()
    return jsonify(lista)

@app.route("/faturas/proximas")
@login_obrigatorio
def listar_proximas_faturas():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT d.descricao, d.valor, d.data, f.nome, f.dia_fechamento
        FROM despesas d
        JOIN formas_pagamento f ON d.forma_pagamento_id = f.id
        WHERE f.dia_fechamento IS NOT NULL
        AND d.usuario_id = %s
        AND NOT EXISTS (
            SELECT 1 FROM faturas_pagas fp
            WHERE fp.forma_pagamento_id = d.forma_pagamento_id
            AND d.data BETWEEN fp.data_inicio AND fp.data_fim
        )
        ORDER BY d.data ASC
    """, (usuario_id,))

    dados = cur.fetchall()
    hoje = date.today()
    lista_proxima = []
    lista_futuro = []

    for descricao, valor, data, forma, dia_fechamento in dados:
        if hoje.day > dia_fechamento:
            inicio_atual = date(hoje.year, hoje.month, dia_fechamento) + relativedelta(days=1)
        else:
            mes_anterior = hoje - relativedelta(months=1)
            inicio_atual = date(mes_anterior.year, mes_anterior.month, dia_fechamento) + relativedelta(days=1)

        fim_atual = inicio_atual + relativedelta(months=1)
        inicio_proxima = fim_atual
        fim_proxima = inicio_proxima + relativedelta(months=1)

        item = {
            "descricao": descricao,
            "valor": float(valor),
            "data": str(data),
            "forma": forma
        }

        if inicio_proxima <= data < fim_proxima:
            lista_proxima.append(item)
        elif data >= fim_proxima:
            lista_futuro.append(item)

    cur.close()
    conn.close()
    return jsonify({"proxima": lista_proxima, "futuro": lista_futuro})

@app.route("/faturas/futuro")
@login_obrigatorio
def faturas_futuro():
    usuario_id = get_usuario()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT d.descricao, d.valor, d.data, f.nome, f.dia_fechamento, f.id
        FROM despesas d
        JOIN formas_pagamento f ON d.forma_pagamento_id = f.id
        WHERE f.dia_fechamento IS NOT NULL
        AND d.usuario_id = %s
        ORDER BY d.data
    """, (usuario_id,))

    dados = cur.fetchall()
    hoje = datetime.today()
    faturas_por_mes = {}

    for descricao, valor, data, forma, dia_fechamento, forma_id in dados:
        if hoje.day > dia_fechamento:
            inicio_atual = date(hoje.year, hoje.month, dia_fechamento) + relativedelta(days=1)
        else:
            mes_anterior = hoje - relativedelta(months=1)
            inicio_atual = date(mes_anterior.year, mes_anterior.month, dia_fechamento) + relativedelta(days=1)

        if data < inicio_atual + relativedelta(months=1):
            continue

        diferenca_meses = (data.year - inicio_atual.year) * 12 + (data.month - inicio_atual.month)
        chave_mes = (inicio_atual + relativedelta(months=diferenca_meses)).strftime("%Y-%m")

        if chave_mes not in faturas_por_mes:
            faturas_por_mes[chave_mes] = []

        faturas_por_mes[chave_mes].append({
            "descricao": descricao,
            "valor": float(valor),
            "data": str(data),
            "forma": forma
        })

    cur.close()
    conn.close()
    return jsonify(faturas_por_mes)

# ================= INIT =================

if __name__ == "__main__":
    app.run(debug=True)