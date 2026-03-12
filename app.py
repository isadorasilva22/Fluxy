from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/controle")
def controle():
    return render_template("controle.html")

@app.route("/registros")
def registros():
    return render_template("registros.html")

if __name__ == "__main__":
    app.run(debug=True)