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

    cur = conn.cursor()
    cur.execute(
        "INSERT INTO despesas (descricao, valor, data, tipo_id) VALUES (%s,%s,%s,%s) RETURNING *",
        (data["descricao"], data["valor"], data["data"], data["tipo_id"])
    )

    nova = cur.fetchone()
    conn.commit()
    cur.close()

    return jsonify({
        "id": nova[0],
        "descricao": nova[1],
        "valor": float(nova[2]),
        "data": str(nova[3]),
        "tipo_id":str(nova[4])
    })

@app.route("/despesas/<int:id>", methods=["PUT"])
def editar_despesa(id):

    data = request.json
    cur = conn.cursor()

    cur.execute("""
        UPDATE despesas
        SET descricao=%s, valor=%s, data=%s
        WHERE id=%s
    """, (data["descricao"], data["valor"], data["data"], id))

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