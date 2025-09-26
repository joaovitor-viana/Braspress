import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  next();
});

// CONFIGURAÇÕES FIXAS
const CNPJ_REMETENTE = 'SEU_CNPJ';
const CEP_ORIGEM = 'SEU_CEP_DE_SAIDA';
const BRASPRESS_USER = 'SEU_USUARIO';
const BRASPRESS_PASS = 'SUA_SENHA';

// ENDPOINT que a YAMPI vai chamar
app.post('/frete', async (req, res) => {
    // 👇 ADICIONE ESTA LINHA AQUI
  console.log('REQ BODY:', req.body);

  const skus = req.body.skus;

  skus.forEach(item => {
    // seu processamento
  });

  res.json({ ok: true });
});

app.listen(3000, () => console.log('Servidor rodando...'));
  try {
    // 1) Ler dados que Yampi envia
    const dados = req.body;
    const cepDestino = dados.zipcode;
    const valorMercadoria = dados.amount;
    const skus = dados.skus;

    // 2) Converter dados para formato da Braspress
    let pesoTotal = 0;
    let volumes = 0;
    let cubagem = [];

    skus.forEach(item => {
      pesoTotal += item.weight * item.quantity;
      volumes += item.quantity;

      cubagem.push({
        altura: item.height / 100,       // cm → m
        largura: item.width / 100,
        comprimento: item.length / 100,
        volumes: item.quantity
      });
    });

    const payloadBraspress = {
      cnpjRemetente: CNPJ_REMETENTE,
      cnpjDestinatario: '00000000000',   // pode ser fixo se não exigir CNPJ do cliente
      modal: 'R',
      tipoFrete: '1',
      cepOrigem: CEP_ORIGEM,
      cepDestino: cepDestino,
      vlrMercadoria: valorMercadoria,
      peso: pesoTotal,
      volumes: volumes,
      cubagem: cubagem
    };

    // 3) Chamar API da Braspress
    const resposta = await fetch('https://api.braspress.com/v1/cotacao/calcular/json', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${BRASPRESS_USER}:${BRASPRESS_PASS}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadBraspress)
    });

    const dadosBraspress = await resposta.json();

    // 4) Montar resposta no formato que Yampi espera
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
    res.status(500).json({ error: 'Erro ao calcular frete' });
  }
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => console.log(`API de frete rodando na porta ${PORT}`));
