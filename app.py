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
    cur.execute("SELECT * FROM despesas ORDER BY data DESC")
    rows = cur.fetchall()

    despesas = []
    for r in rows:
        despesas.append({
            "id": r[0],
            "descricao": r[1],
            "valor": float(r[2]),
            "data": str(r[3])
        })

    cur.close()
    return jsonify(despesas)


@app.route("/despesas", methods=["POST"])
def adicionar_despesa():

    data = request.json

    descricao = data.get("descricao")
    valor = data.get("valor")
    data_despesa = data.get("data")
    tipo_id = data.get("tipo_id")

    forma_pagamento = data.get("forma_pagamento")
    parcelas = data.get("parcelas", 1)
    recorrente = data.get("recorrente", False)

    # 🔒 Validações básicas
    if not descricao or not valor or not data_despesa or not tipo_id:
        return {"erro": "Campos obrigatórios faltando"}, 400

    if not forma_pagamento:
        return {"erro": "Forma de pagamento é obrigatória"}, 400

    # 💳 Regra de negócio
    if forma_pagamento != "credito":
        parcelas = 1

    cur = conn.cursor()

    cur.execute("""
        INSERT INTO despesas 
        (descricao, valor, data, tipo_id, forma_pagamento, parcelas, recorrente)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        RETURNING *
    """, (
        descricao,
        valor,
        data_despesa,
        tipo_id,
        forma_pagamento,
        parcelas,
        recorrente
    ))

    nova = cur.fetchone()
    conn.commit()
    cur.close()

    return jsonify({
        "id": nova[0],
        "descricao": nova[1],
        "valor": float(nova[2]),
        "data": str(nova[3]),
        "tipo_id": str(nova[4]),
        "forma_pagamento": nova[5],
        "parcelas": nova[6],
        "recorrente": nova[7]
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

    # 💳 Regra de negócio
    if forma_pagamento_id != 1:
        parcelas = 1

    cur = conn.cursor()

    cur.execute("""
        UPDATE despesas
        SET descricao=%s,
            valor=%s,
            data=%s,
            tipo_id=%s,
            forma_pagamento=%s,
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

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO formas_pagamento (nome) VALUES (%s)",
        (data["nome"],)
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
        {"id": d[0], "nome": d[1]}
        for d in dados
    ])


# LIMITES BANCARIOS

@app.route("/limites", methods=["POST"])
def criar_limite():
    data = request.json

    cur = conn.cursor()
    cur.execute("""
        INSERT INTO limites (tipo_id, valor_limite)
        VALUES (%s, %s)
    """, (data["tipo_id"], data["valor"]))

    conn.commit()
    return {"mensagem": "Limite salvo"}


###

if __name__ == "__main__":
    app.run(debug=True)