from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import psycopg2
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

app = Flask(__name__)
CORS(app)

conn = psycopg2.connect(
    host="localhost",
    database="fluxy",
    user="postgres",
    password="sua_senha",
    port=5432
)

#PÁGINAS

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/controle")
def controle():
    return render_template("controle.html")

@app.route("/registros")
def registros():
    return render_template("registros.html")

#RECEITAS

@app.route("/receitas", methods=["GET"])
def listar_receitas():

    cur = conn.cursor()
    cur.execute("SELECT * FROM receitas ORDER BY data DESC")

    rows = cur.fetchall()

    receitas = []

    for r in rows:
        receitas.append({
            "id": r[0],
            "descricao": r[1],
            "valor": float(r[2]),
            "data": str(r[3])
        })

    cur.close()

    return jsonify(receitas)

@app.route("/receitas", methods=["POST"])
def adicionar_receita():

    data = request.json

    cur = conn.cursor()

    cur.execute(
        "INSERT INTO receitas (descricao, valor, data) VALUES (%s,%s,%s) RETURNING *",
        (data["descricao"], data["valor"], data["data"])
    )

    nova = cur.fetchone()

    conn.commit()
    cur.close()

    return jsonify({
        "id": nova[0],
        "descricao": nova[1],
        "valor": float(nova[2]),
        "data": str(nova[3])
    })

@app.route("/receitas/<int:id>", methods=["PUT"])
def editar_receita(id):
    data = request.json
    cur = conn.cursor()

    cur.execute("""
        UPDATE receitas
        SET descricao=%s, valor=%s, data=%s
        WHERE id=%s
    """, (data["descricao"], data["valor"], data["data"], id))

    conn.commit()
    cur.close()
    return jsonify({"mensagem": "Receita atualizada"})


@app.route("/receitas/<int:id>", methods=["DELETE"])
def excluir_receita(id):
    cur = conn.cursor()

    cur.execute("DELETE FROM receitas WHERE id=%s", (id,))
    conn.commit()

    return jsonify({"mensagem": "Receita excluída"})

# DESPESAS

@app.route("/despesas", methods=["GET"])
def listar_despesas():
    cur = conn.cursor()
    cur.execute("SELECT d.id, d.descricao, d.valor, d.data, f.nome as forma, t.id as tipo_id, t.nome as tipo FROM despesas d LEFT JOIN formas_pagamento f ON d.forma_pagamento_id = f.id LEFT JOIN tipos_despesa t ON d.tipo_id = t.id ORDER BY data DESC")
    rows = cur.fetchall()

    despesas = []
    for r in rows:
        despesas.append({
            "id": r[0],
            "descricao": r[1],
            "valor": float(r[2]),
            "data": str(r[3]),
            "forma": r[4],
            "tipo_id": r[5],
            "tipo": r[6]
        })

    cur.close()
    return jsonify(despesas)

@app.route("/despesas", methods=["POST"])
def adicionar_despesa():
    data = request.json

    descricao = data["descricao"]
    valor_total = float(data["valor"])
    data_inicial = datetime.strptime(data["data"], "%Y-%m-%d")
    tipo_id = data["tipo_id"]
    forma_pagamento_id = data.get("forma_pagamento_id")

    if forma_pagamento_id in ("", None):
        forma_pagamento_id = None

    parcelas = int(data.get("parcelas", 1))

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

    valor_parcela = round(valor_total / parcelas, 2)

    despesas_criadas = []

    for i in range(parcelas):
        data_parcela = data_inicial + relativedelta(months=i)

        descricao_parcela = f"{descricao} ({i+1}/{parcelas})"

        cur.execute("""
            INSERT INTO despesas 
            (descricao, valor, data, tipo_id, forma_pagamento_id) 
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (
            descricao_parcela,
            valor_parcela,
            data_parcela,
            tipo_id,
            forma_pagamento_id
        ))

        despesas_criadas.append(cur.fetchone())

    conn.commit()
    cur.close()

    return jsonify({"mensagem": f"{parcelas} parcelas criadas com sucesso!"})

@app.route("/despesas/<int:id>", methods=["PUT"])
def editar_despesa(id):

    data = request.json

    descricao = data.get("descricao")
    valor = data.get("valor")
    data_despesa = data.get("data")
    tipo_id = data.get("tipo_id")
    forma_pagamento_id = data.get("forma_pagamento_id")
    parcelas = data.get("parcelas", 1)

    # Parcelamento
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
        WHERE id=%s
    """, (
        descricao,
        valor,
        data_despesa,
        tipo_id,
        forma_pagamento_id,
        parcelas,
        id
    ))

    conn.commit()
    cur.close()

    return jsonify({"mensagem": "Despesa atualizada"})

@app.route("/despesas/<int:id>", methods=["DELETE"])
def excluir_despesa(id):

    cur = conn.cursor()

    cur.execute("DELETE FROM despesas WHERE id=%s", (id,))
    conn.commit()
    cur.close()

    return jsonify({"mensagem": "Despesa excluída"})

# TIPO DE DESPESA

@app.route("/tipos", methods=["POST"])
def criar_tipo():
    data = request.json
    nome = data["nome"]

    cur = conn.cursor()
    cur.execute("INSERT INTO tipos_despesa (nome) VALUES (%s)", (nome,))
    conn.commit()

    return {"mensagem": "Tipo criado"}

@app.route("/tipos", methods=["GET"])
def listar_tipos():
    cur = conn.cursor()
    cur.execute("SELECT * FROM tipos_despesa")

    tipos = [
        {"id": row[0], "nome": row[1]}
        for row in cur.fetchall()
    ]

    return jsonify(tipos)

# FORMAS DE PAGAMENTO

@app.route("/formas-pagamento", methods=["POST"])
def criar_forma_pagamento():
    data = request.json
    print(data)

    nome = data.get("nome")
    permite_parcelamento = data.get("permite_parcelamento", False)

    if isinstance(permite_parcelamento, str):
        permite_parcelamento = permite_parcelamento.lower() in ["true", "1", "on"]

    permite_parcelamento = bool(permite_parcelamento)

    cur = conn.cursor()

    dia_fechamento = data.get("dia_fechamento")

    if dia_fechamento in ("", None):
        dia_fechamento = None
    else:
        dia_fechamento = int(dia_fechamento)

    cur.execute(
        "INSERT INTO formas_pagamento (nome, permite_parcelamento, dia_fechamento) VALUES (%s, %s, %s)",
        (nome, permite_parcelamento, dia_fechamento)
    )

    conn.commit()
    cur.close()

    return {"mensagem": "Forma de pagamento criada"}

@app.route("/formas-pagamento", methods=["GET"])
def listar_formas_pagamento():
    cur = conn.cursor()
    cur.execute("SELECT * FROM formas_pagamento ORDER BY nome")
    dados = cur.fetchall()
    cur.close()

    return jsonify([
        {"id": d[0], "nome": d[1], "permite_parcelamento": d[2], "dia_fechamento": d[3]}
        for d in dados
    ])

@app.route("/formas-pagamento/<int:id>", methods=["GET"])
def obter_forma_pagamento(id):
    cur = conn.cursor()

    cur.execute(
        "SELECT id, nome, permite_parcelamento, dia_fechamento FROM formas_pagamento WHERE id=%s",
        (id,)
    )

    d = cur.fetchone()
    cur.close()

    if not d:
        return jsonify({"erro": "Forma não encontrada"}), 404

    return jsonify({
        "id": d[0],
        "nome": d[1],
        "permite_parcelamento": d[2],
        "dia_fechamento": d[3]
    })

@app.route("/formas-pagamento/<int:id>", methods=["PUT"])
def editar_forma(id):
    data = request.json

    nome = data.get("nome")
    permite = data.get("permite_parcelamento")
    dia = data.get("dia_fechamento")

    if dia in ("", None):
        dia = None
    else:
        dia = int(dia)

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

    return jsonify({"mensagem": "Forma atualizada"})

@app.route("/formas-pagamento/<int:id>", methods=["DELETE"])
def excluir_forma(id):
    cur = conn.cursor()
    cur.execute("DELETE FROM formas_pagamento WHERE id=%s", (id,))
    conn.commit()
    cur.close()

    return jsonify({"mensagem": "Forma excluída"})

# LIMITES BANCARIOS

@app.route("/limites", methods=["POST"])
def criar_limite():
    data = request.json

    forma_pagamento_id = data.get("forma_pagamento_id")
    valor = data.get("valor")

    cur = conn.cursor()

    # Verifica se já existe limite para essa forma
    cur.execute("""
        SELECT id FROM limites 
        WHERE forma_pagamento_id = %s
    """, (forma_pagamento_id,))

    existente = cur.fetchone()

    if existente:
        cur.execute("""
            UPDATE limites
            SET valor = %s
            WHERE forma_pagamento_id = %s
        """, (valor, forma_pagamento_id))
    else:
        cur.execute("""
            INSERT INTO limites (forma_pagamento_id, valor)
            VALUES (%s, %s)
        """, (forma_pagamento_id, valor))

    conn.commit()
    cur.close()

    return {"mensagem": "Limite salvo"}

@app.route("/limites/mensal", methods=["GET"])
def calcular_limites_mensais():

    cur = conn.cursor()

    cur.execute("""
        SELECT 
            f.id,
            f.nome,
            l.valor AS limite,
            f.dia_fechamento
        FROM limites l
        JOIN formas_pagamento f 
            ON f.id = l.forma_pagamento_id
    """)

    formas = cur.fetchall()

    resposta = []

    hoje = datetime.today()

    for f in formas:
        forma_id, nome, limite, dia_fechamento = f

        if dia_fechamento is None:
            inicio = hoje.replace(day=1)
            fim = hoje
        else:
            if dia_fechamento:
                if hoje.day > dia_fechamento:
                    # já passou do fechamento → usa mês atual
                    inicio = date(hoje.year, hoje.month, dia_fechamento) + relativedelta(days=1)
                else:
                    # ainda não chegou → usa mês anterior
                    data_mes_anterior = hoje - relativedelta(months=1)
                    inicio = date(data_mes_anterior.year, data_mes_anterior.month, dia_fechamento) + relativedelta(days=1)
        cur.execute("""
            SELECT COALESCE(SUM(valor), 0)
            FROM despesas
            WHERE forma_pagamento_id = %s
            AND data::date >= %s
        """, (forma_id, inicio))

        usado = cur.fetchone()[0]

        disponivel = float(limite) - float(usado)

        resposta.append({
            "forma": nome,
            "limite": float(limite),
            "gasto": float(usado),
            "disponivel": disponivel
        })

    cur.close()

    return jsonify(resposta)

# GRÁFICOS

@app.route("/grafico/resumo")
def grafico_resumo():
    mes = request.args.get("mes")

    cur = conn.cursor()

    filtro = ""
    params = []

    if mes:
        filtro = "WHERE TO_CHAR(data, 'YYYY-MM') = %s"
        params.append(mes)

    cur.execute(f"SELECT COALESCE(SUM(valor),0) FROM receitas {filtro}", params)
    receitas = cur.fetchone()[0]

    cur.execute(f"SELECT COALESCE(SUM(valor),0) FROM despesas {filtro}", params)
    despesas = cur.fetchone()[0]

    cur.close()

    return jsonify({
        "receitas": float(receitas),
        "despesas": float(despesas)
    })

@app.route("/grafico/despesas-mensais")
def grafico_mensal():
    ano = request.args.get("ano")

    cur = conn.cursor()

    if ano:
        cur.execute("""
            SELECT EXTRACT(MONTH FROM data), SUM(valor)
            FROM despesas
            WHERE EXTRACT(YEAR FROM data) = %s
            GROUP BY 1
            ORDER BY 1
        """, (ano,))
    else:
        cur.execute("""
            SELECT EXTRACT(MONTH FROM data), SUM(valor)
            FROM despesas
            GROUP BY 1
            ORDER BY 1
        """)

    dados = cur.fetchall()
    cur.close()

    meses = [int(d[0]) for d in dados]
    valores = [float(d[1]) for d in dados]

    return jsonify({"meses": meses, "valores": valores})

@app.route("/grafico/por-tipo")
def grafico_tipo():
    mes = request.args.get("mes")

    cur = conn.cursor()

    filtro = ""
    params = []

    if mes:
        filtro = "WHERE TO_CHAR(d.data, 'YYYY-MM') = %s"
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

    return jsonify({
        "labels": [d[0] for d in dados],
        "valores": [float(d[1]) for d in dados]
    })

@app.route("/grafico/por-forma")
def grafico_forma():
    mes = request.args.get("mes")

    cur = conn.cursor()

    filtro = ""
    params = []

    if mes:
        filtro = "WHERE TO_CHAR(d.data, 'YYYY-MM') = %s"
        params.append(mes)

    cur.execute(f"""
        SELECT COALESCE(f.nome,'Sem forma'), SUM(d.valor)
        FROM despesas d
        LEFT JOIN formas_pagamento f ON d.forma_pagamento_id = f.id
        {filtro}
        GROUP BY f.nome
    """, params)

    dados = cur.fetchall()
    cur.close()

    return jsonify({
        "labels": [d[0] for d in dados],
        "valores": [float(d[1]) for d in dados]
    })
###

if __name__ == "__main__":
    app.run(debug=True)