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
        "INSERT INTO despesas (descricao, valor, data) VALUES (%s,%s,%s) RETURNING *",
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


if __name__ == "__main__":
    app.run(debug=True)