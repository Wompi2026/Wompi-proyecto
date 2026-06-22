require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const connectDB = require("./config/db");
const Payment = require("./models/Payment");

const app = express();

app.use(express.json());
app.use(express.static("public"));

// 🌐 frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/historial", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "historial.html"));
});

// 💳 recibir evento frontend (solo log)
app.post("/pago-wompi", (req, res) => {
  console.log("📩 Pago recibido del frontend:", req.body);
  res.json({ ok: true });
});

app.post("/webhook/wompi", async (req, res) => {

  try {

    console.log("=================================");
    console.log("🔔 WEBHOOK WOMPI RECIBIDO");
    console.log("=================================");

    console.log(JSON.stringify(req.body, null, 2));

    console.log("=================================");

    res.status(200).json({
      recibido: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

});

app.get("/api/pagos", async (req, res) => {
  try {

    const pagos = await Payment.find()
      .sort({ createdAt: -1 });

    res.json(pagos);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
});

app.get("/api/estadisticas", async (req, res) => {

  try {

    const pagos = await Payment.find();

    const totalPagos = pagos.length;

    const totalRecaudado = pagos.reduce(
      (total, pago) => total + pago.amount,
      0
    );

    const aprobados = pagos.filter(
      pago => pago.status === "APPROVED"
    ).length;

    res.json({
      totalPagos,
      aprobados,
      totalRecaudado
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});


// 🔐 VERIFICACIÓN REAL
app.post("/verificar-pago/:id", async (req, res) => {

  try {

    const id = req.params.id;
    const { name, email } = req.body;

    const response = await axios.get(
      `https://production.wompi.co/v1/transactions/${id}`
    );

    const transaction = response.data.data;

    console.log("🔍 VERIFICACIÓN REAL WOMPI:", transaction);

    // VALIDACIÓN FINAL SEGURA
const isApproved = transaction.status === "APPROVED";

const existe = await Payment.findOne({
  transactionId: transaction.id
});

if (!existe) {

  await Payment.create({
    name,
    email,
    transactionId: transaction.id,
    reference: transaction.reference,
    amount: transaction.amount_in_cents,
    currency: transaction.currency,
    status: transaction.status
  });

  console.log("✅ Pago guardado en MongoDB");

} else {

  console.log("⚠️ Pago ya existe, no se guarda nuevamente");

}

  } catch (error) {

    console.log("❌ Error verificando pago:", error.message);

    res.status(500).json({
      ok: false,
      error: error.message
    });

  }

});

app.get("/pagos", async (req, res) => {
  try {
    const pagos = await Payment.find().sort({ createdAt: -1 });

    res.json(pagos);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


connectDB();

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});