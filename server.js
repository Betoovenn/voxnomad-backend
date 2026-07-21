const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'VoxNomad API funcionando ✅', version: '2.0.0' });
});

// Aprobar pago Pi
app.post('/payments/approve', async (req, res) => {
  const { paymentId } = req.body;
  try {
    const response = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {},
      { headers: { Authorization: `Key ${process.env.PI_API_KEY}` } }
    );
    res.json({ message: 'Aprobado', payment: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Error al aprobar pago' });
  }
});

// Completar pago Pi
app.post('/payments/complete', async (req, res) => {
  const { paymentId, txid } = req.body;
  try {
    const response = await axios.post(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      { txid },
      { headers: { Authorization: `Key ${process.env.PI_API_KEY}` } }
    );
    res.json({ message: 'Completado', payment: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Error al completar pago' });
  }
});

// Motor de traducción de voz
app.post('/translate', upload.single('audio'), async (req, res) => {
  const { sourceLang, targetLang } = req.body;
  
  try {
    // Paso 1: Transcribir audio con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
      language: sourceLang
    });
    const originalText = transcription.text;

    // Paso 2: Traducir con DeepL
    const deeplResponse = await axios.post(
      'https://api-free.deepl.com/v2/translate',
      {
        text: [originalText],
        target_lang: targetLang.toUpperCase()
      },
      {
        headers: {
          Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const translatedText = deeplResponse.data.translations[0].text;

    // Paso 3: Convertir traducción a voz con OpenAI TTS
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: translatedText
    });

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    // Enviar audio traducido
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('X-Original-Text', encodeURIComponent(originalText));
    res.set('X-Translated-Text', encodeURIComponent(translatedText));
    res.send(audioBuffer);

  } catch (error) {
    console.error('Error en traducción:', error.message);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Error en el motor de traducción' });}
});

app.listen(PORT, () => {
  console.log(`VoxNomad backend v2 corriendo en puerto ${PORT}`);
});