from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import psycopg2

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
    cur.execute("SELECT d.id, d.descricao, d.valor, d.data, f.nome as forma FROM despesas d LEFT JOIN formas_pagamento f ON d.forma_pagamento_id = f.id ORDER BY data DESC")
    rows = cur.fetchall()

    despesas = []
    for r in rows:
        despesas.append({
            "id": r[0],
            "descricao": r[1],
            "valor": float(r[2]),
            "data": str(r[3]),
            "forma": r[4]
        })

    cur.close()
    return jsonify(despesas)


@app.route("/despesas", methods=["POST"])
def adicionar_despesa():
    data = request.json

    cur = conn.cursor()

    cur.execute("""
        INSERT INTO despesas 
        (descricao, valor, data, tipo_id, forma_pagamento_id) 
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
    """, (
        data["descricao"],
        data["valor"],
        data["data"],
        data["tipo_id"],
        data["forma_pagamento_id"]
    ))

    nova = cur.fetchone()
    conn.commit()
    cur.close()

    return jsonify({
        "id": nova[0],
        "descricao": nova[1],
        "valor": float(nova[2]),
        "data": str(nova[3]),
        "tipo_id": nova[4],
        "forma_pagamento_id": nova[5]
    })

@app.route("/despesas/<int:id>", methods=["PUT"])
def editar_despesa(id):

    data = request.json

    descricao = data.get("descricao")
    valor = data.get("valor")
    data_despesa = data.get("data")
    tipo_id = data.get("tipo_id")

    forma_pagamento_id = data.get("forma_pagamento_id")
    parcelas = data.get("parcelas", 1)
    recorrente = data.get("recorrente", False)

    # Parcelamento
    cur = conn.cursor()
    cur.execute(
        "SELECT permite_parcelamento FROM formas_pagamento WHERE id=%s",
        (forma_pagamento_id,)
    )

    permite = cur.fetchone()[0]

    if not permite:
        parcelas = 1

    cur = conn.cursor()

    cur.execute("""
        UPDATE despesas
        SET descricao=%s,
            valor=%s,
            data=%s,
            tipo_id=%s,
            forma_pagamento_id=%s,
            parcelas=%s,
            recorrente=%s
        WHERE id=%s
    """, (
        descricao,
        valor,
        data_despesa,
        tipo_id,
        forma_pagamento_id,
        parcelas,
        recorrente,
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
    cur.execute(
        "INSERT INTO formas_pagamento (nome, permite_parcelamento) VALUES (%s, %s)",
        (nome, permite_parcelamento)
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
        {"id": d[0], "nome": d[1], "permite_parcelamento": d[2]}
        for d in dados
    ])

@app.route("/formas-pagamento/<int:id>", methods=["GET"])
def obter_forma_pagamento(id):
    cur = conn.cursor()

    cur.execute(
        "SELECT id, nome, permite_parcelamento FROM formas_pagamento WHERE id=%s",
        (id,)
    )

    d = cur.fetchone()
    cur.close()

    if not d:
        return jsonify({"erro": "Forma não encontrada"}), 404

    return jsonify({
        "id": d[0],
        "nome": d[1],
        "permite_parcelamento": d[2]
    })

# LIMITES BANCARIOS

@app.route("/limites", methods=["POST"])
def criar_limite():
    data = request.json

    forma_pagamento_id = data.get("forma_pagamento_id")
    valor = data.get("valor")

    cur = conn.cursor()

    # 🔥 verifica se já existe limite para essa forma
    cur.execute("""
        SELECT id FROM limites 
        WHERE forma_pagamento_id = %s
    """, (forma_pagamento_id,))

    existente = cur.fetchone()

    if existente:
        # UPDATE
        cur.execute("""
            UPDATE limites
            SET valor = %s
            WHERE forma_pagamento_id = %s
        """, (valor, forma_pagamento_id))
    else:
        # INSERT
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
            f.nome,
            l.valor AS limite,
            COALESCE(SUM(d.valor), 0) AS gasto

        FROM limites l
        JOIN formas_pagamento f 
            ON f.id = l.forma_pagamento_id

        LEFT JOIN despesas d 
            ON d.forma_pagamento_id = f.id
            AND DATE_TRUNC('month', d.data) = DATE_TRUNC('month', CURRENT_DATE)

        GROUP BY f.nome, l.valor
    """)

    resultados = cur.fetchall()
    cur.close()

    resposta = []

    for r in resultados:
        nome, limite, gasto = r

        resposta.append({
            "forma": nome,
            "limite": float(limite),
            "gasto": float(gasto),
            "disponivel": float(limite) - float(gasto)
        })

    return jsonify(resposta)

###

if __name__ == "__main__":
    app.run(debug=True)