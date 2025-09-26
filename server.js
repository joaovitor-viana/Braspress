import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ----------------------
// VARIÁVEIS DE AMBIENTE
// ----------------------
const CNPJ_REMETENTE = process.env.CNPJ_REMETENTE;
const CEP_ORIGEM = process.env.CEP_ORIGEM;
const BRASPRESS_USER = process.env.BRASPRESS_USER;
const BRASPRESS_PASS = process.env.BRASPRESS_PASS;

// ----------------------
// ROTA DE FRETE
// ----------------------
app.post('/frete', async (req, res) => {
  console.log('REQ BODY:', JSON.stringify(req.body, null, 2));

  try {
    // Aceita skus ou items
    const skus = req.body.skus || req.body.items;

    if (!skus) {
      return res.status(400).json({ error: 'Campo skus ou items ausente ou inválido' });
    }

    if (!Array.isArray(skus)) {
      return res.status(400).json({ error: 'Campo skus ou items deve ser um array' });
    }

    const cepDestino = req.body.zipcode;
    const valorMercadoria = req.body.amount;

    // Calcular peso total, volumes e cubagem
    let pesoTotal = 0;
    let volumes = 0;
    let cubagem = [];

    skus.forEach(item => {
      pesoTotal += (item.weight || 0) * (item.quantity || 1);
      volumes += item.quantity || 1;

      cubagem.push({
        altura: (item.height || 0) / 100,
        largura: (item.width || 0) / 100,
        comprimento: (item.length || 0) / 100,
        volumes: item.quantity || 1
      });
    });

    // Payload Braspress
    const payloadBraspress = {
      cnpjRemetente: CNPJ_REMETENTE,
      cnpjDestinatario: '00000000000', // Placeholder, Yampi envia CNPJ real depois
      modal: 'R',
      tipoFrete: '1',
      cepOrigem: CEP_ORIGEM,
      cepDestino,
      vlrMercadoria: valorMercadoria,
      peso: pesoTotal,
      volumes,
      cubagem
    };

    // Chamada real à Braspress
    const resposta = await fetch('https://api.braspress.com/v1/cotacao/calcular/json', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${BRASPRESS_USER}:${BRASPRESS_PASS}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadBraspress)
    });

    const dadosBraspress = await resposta.json();

    // Resposta para Yampi
    const retornoYampi = {
      quotes: [
        {
          name: 'Braspress',
          service: 'Rodoviário',
          price: dadosBraspress.totalFrete || 0,
          days: dadosBraspress.prazo || 0,
          quote_id: 1,
          free_shipment: false
        }
      ]
    };

    res.json(retornoYampi);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao calcular frete' });
  }
});

// ----------------------
// INICIAR SERVIDOR
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API de frete rodando na porta ${PORT}`));
