import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ----------------------
// CONFIGURAÇÕES VIA VARIÁVEIS DE AMBIENTE
// ----------------------
const CNPJ_REMETENTE = process.env.CNPJ_REMETENTE || 'SEU_CNPJ';
const CEP_ORIGEM = process.env.CEP_ORIGEM || 'SEU_CEP_DE_SAIDA';
const BRASPRESS_USER = process.env.BRASPRESS_USER || 'SEU_USUARIO';
const BRASPRESS_PASS = process.env.BRASPRESS_PASS || 'SUA_SENHA';

// ----------------------
// ROTA DE FRETE
// ----------------------
app.post('/frete', async (req, res) => {
  console.log('REQ BODY:', JSON.stringify(req.body, null, 2));

  try {
    // Aceita tanto skus quanto items
    const skus = req.body.skus || req.body.items;

    if (!skus) {
      console.log('Campo skus ou items não encontrado no body');
      return res.status(400).json({ error: 'Campo skus ou items ausente ou inválido' });
    }

    if (!Array.isArray(skus)) {
      console.log('Campo skus não é um array');
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
        altura: (item.height || 0) / 100,    // cm → m
        largura: (item.width || 0) / 100,
        comprimento: (item.length || 0) / 100,
        volumes: item.quantity || 1
      });
    });

    // ----------------------
    // PAYLOAD PARA BRASPRESS
    // ----------------------
    const payloadBraspress = {
      cnpjRemetente: CNPJ_REMETENTE,
      cnpjDestinatario: '00000000000',
      modal: 'R',
      tipoFrete: '1',
      cepOrigem: CEP_ORIGEM,
      cepDestino,
      vlrMercadoria: valorMercadoria,
      peso: pesoTotal,
      volumes,
      cubagem
    };

    // ----------------------
    // CHAMADA SIMULADA PARA BRASPRESS (teste)
    // ----------------------
    // Substitua abaixo pela chamada real à Braspress quando quiser
    const dadosBraspress = { totalFrete: 42.35, prazo: 3 };

    // ----------------------
    // RESPOSTA PARA YAMPI
    // ----------------------
    const retornoYampi = {
      quotes: [
        {
          name: 'Braspress',
          service: 'Rodoviário',
          price: dadosBraspress.totalFrete,
          days: dadosBraspress.prazo,
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
