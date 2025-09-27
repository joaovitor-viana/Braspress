import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ----------------------
// CREDENCIAIS BRASPRESS FIXAS
// ----------------------
const CNPJ_REMETENTE = '58335466000128';
const CEP_ORIGEM = '88814552'; // CEP fixo
const BRASPRESS_USER = '58335466000128_PRD';
const BRASPRESS_PASS = 'xr7BASLCz30k94jJ';

// ----------------------
// ROTA DE FRETE
// ----------------------
app.post('/frete', async (req, res) => {
  console.log('REQ BODY:', JSON.stringify(req.body, null, 2));

  try {
    const skus = req.body.skus || req.body.items;

    if (!skus || !Array.isArray(skus)) {
      return res.status(400).json({ error: 'Campo skus ou items ausente ou inválido' });
    }

    const cepDestino = (req.body.zipcode || '').replace(/\D/g, ''); // apenas números
    const valorMercadoria = req.body.amount;

    // Pegando CPF do cliente
    const cpfCliente = req.body.cart?.customer?.document?.replace(/\D/g, '');
    if (!cpfCliente) {
      return res.status(400).json({ error: 'CPF do cliente ausente' });
    }

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

    // Payload para Braspress
    const payloadBraspress = {
      cnpjRemetente: CNPJ_REMETENTE,
      cnpjDestinatario: cpfCliente,
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
    console.log('Resposta Braspress:', JSON.stringify(dadosBraspress, null, 2));

    // Mapear campos corretos da Braspress
    const totalFrete = Number(dadosBraspress.totalFrete || 0);
    const prazo = Number(dadosBraspress.prazo || 0);

    // Retorno para Yampi
    const retornoYampi = {
      quotes: [
        {
          name: 'Braspress',
          service: 'Rodoviário',
          price: totalFrete,
          days: prazo,
          quote_id: 1,
          free_shipment: totalFrete === 0
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
