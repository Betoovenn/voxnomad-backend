const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'VoxNomad API funcionando ✅',
    version: '1.0.0'
  });
});

// Aprobar pago — Pi llama esto primero
app.post('/payments/approve', async (req, res) => {
  const { paymentId } = req.body;
  try {
    const response = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`
        }
      }
    );
    res.json({ message: 'Aprobado', payment: response.data });
  } catch (error) {
    console.error('Error aprobando pago:', error.message);
    res.status(500).json({ error: 'Error al aprobar pago' });
  }
});

// Completar pago — Pi llama esto cuando el usuario confirma
app.post('/payments/complete', async (req, res) => {
  const { paymentId, txid } = req.body;
  try {
    const response = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`
        }
      }
    );
    res.json({ message: 'Completado', payment: response.data });
  } catch (error) {
    console.error('Error completando pago:', error.message);
    res.status(500).json({ error: 'Error al completar pago' });
  }
});

app.listen(PORT, () => {
  console.log(`VoxNomad backend corriendo en puerto ${PORT}`);
});