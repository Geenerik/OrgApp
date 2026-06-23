import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Financas({ setSistemaAtivo, mostrarNotificacao }) {
  const [contaAtiva, setContaAtiva] = useState('KELVIN');
  const [dataFiltro, setDataFiltro] = useState(new Date());

  // Estados dos Formulários Gerais
  const [tipo, setTipo] = useState('ENTRADA'); 
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Outros');
  const [contaDestino, setContaDestino] = useState('EMPRESA'); 
  const [diaVencimento, setDiaVencimento] = useState(''); 
  const [dataVencimento, setDataVencimento] = useState(''); 
  const [recorrente, setRecorrente] = useState(false); 
  const [cartaoSelecionado, setCartaoSelecionado] = useState('');
  const [parcelas, setParcelas] = useState('1'); 
  const [salvando, setSalvando] = useState(false);

  // NOVOS ESTADOS: Regra de Compras Integrada
  const [destinoCompra, setDestinoCompra] = useState('CASA'); // CASA ou LOJA
  const [responsavelPagamento, setResponsavelPagamento] = useState('KELVIN'); // KELVIN, LORRAINE, EMPRESA
  const [meioPagamento, setMeioPagamento] = useState('DINHEIRO'); // DINHEIRO ou CREDITO

  // Estados dos Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [valorModal, setValorModal] = useState('');
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false);
  const [valorReajusteModal, setValorReajusteModal] = useState('');

  // Estados dos Dados do Banco
  const [transacoes, setTransacoes] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [faturaCartao, setFaturaCartao] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [historicoFatura, setHistoricoFatura] = useState(null); 
  const [saldoDevedorMesAnterior, setSaldoDevedorMesAnterior] = useState(0); 
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [carregandoDados, setCarregandoDados] = useState(false);

  // Monitora a mudança do destino da compra para sugerir o pagador correto
  useEffect(() => {
    if (tipo === 'COMPRA_INTEGRADA') {
      if (destinoCompra === 'LOJA') {
        setResponsavelPagamento('EMPRESA');
        setCategoria('Insumos / Loja');
      } else {
        setResponsavelPagamento('KELVIN');
        setCategoria('Casa / Família');
      }
    }
  }, [destinoCompra, tipo]);

  // Sempre que mudar o pagador na compra, atualiza a lista de cartões disponíveis para ele
  useEffect(() => {
    if (tipo === 'COMPRA_INTEGRADA' || tipo === 'LANCAR_CARTAO') {
      buscarCartoesDoPagador(responsavelPagamento);
    }
  }, [responsavelPagamento, tipo]);

  const avancarMes = () => {
    setDataFiltro(new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() + 1, 1));
  };

  const retrocederMes = () => {
    setDataFiltro(new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() - 1, 1));
  };

  const obterStringsFiltro = () => {
    const ano = dataFiltro.getFullYear();
    const mes = String(dataFiltro.getMonth() + 1).padStart(2, '0');
    const anoMesAtual = `${ano}-${mes}`; 

    const dataMesAnt = new Date(dataFiltro.getFullYear(), dataFiltro.getMonth() - 1, 1);
    const anoAnt = dataMesAnt.getFullYear();
    const mesAnt = String(dataMesAnt.getMonth() + 1).padStart(2, '0');
    const anoMesAnterior = `${anoAnt}-${mesAnt}`;

    const primeiroDia = new Date(ano, dataFiltro.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(ano, dataFiltro.getMonth() + 1, 0).toISOString().split('T')[0];

    return { primeiroDia, ultimoDia, anoMesAtual, anoMesAnterior };
  };

  // Garante que a transferência não seja feita para a própria conta ativa
  useEffect(() => {
    if (tipo === 'TRANSFERENCIA' && contaAtiva === contaDestino) {
      if (contaAtiva === 'KELVIN') setContaDestino('EMPRESA');
      else if (contaAtiva === 'EMPRESA') setContaDestino('KELVIN');
      else setContaDestino('KELVIN');
    }
  }, [tipo, contaAtiva]);

  // Busca cartões dinamicamente filtrando pelo responsável atual do pagamento
  const buscarCartoesDoPagador = async (pagador) => {
    const target = tipo === 'COMPRA_INTEGRADA' ? pagador : contaAtiva;
    const { data } = await supabase.from('cartoes').select('*').eq('conta_vinculada', target);
    if (data) {
      setCartoes(data);
      if (data.length > 0) setCartaoSelecionado(data[0].id);
      else setCartaoSelecionado('');
    }
  };

  const carregarDadosCompletos = async () => {
    setCarregandoDados(true);
    const { primeiroDia, ultimoDia, anoMesAtual, anoMesAnterior } = obterStringsFiltro();
    const hoje = new Date();
    const anoMesHojeReal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    try {
      const [
        resFinancas,
        resCartoes,
        resComprasCartao,
        resContas,
        resHistoricoFatura,
        resDividaAnterior
      ] = await Promise.all([
        supabase.from('financas').select('*').eq('conta', contaAtiva).gte('data_lancamento', primeiroDia + 'T00:00:00Z').lte('data_lancamento', ultimoDia + 'T23:59:59Z').order('data_lancamento', { ascending: false }),
        supabase.from('cartoes').select('*').eq('conta_vinculada', contaAtiva),
        supabase.from('compras_cartao').select('*, cartoes(nome_cartao, dia_vencimento)').eq('conta_vinculada', contaAtiva).gte('data_vencimento_parcela', primeiroDia).lte('data_vencimento_parcela', ultimoDia),
        supabase.from('contas_pagar').select('*').eq('conta_vinculada', contaAtiva).gte('data_vencimento', primeiroDia).lte('data_vencimento', ultimoDia).order('data_vencimento', { ascending: true }),
        supabase.from('faturas_pagas').select('*').eq('conta', contaAtiva).eq('ano_mes', anoMesAtual).maybeSingle(),
        anoMesAnterior >= anoMesHojeReal 
          ? Promise.resolve({ data: null }) 
          : supabase.from('faturas_pagas').select('saldo_restante').eq('conta', contaAtiva).eq('ano_mes', anoMesAnterior).maybeSingle()
      ]);

      if (resFinancas.data) {
        setTransacoes(resFinancas.data);
        let ent = 0; let sai = 0;
        resFinancas.data.forEach(t => {
          if (t.tipo === 'ENTRADA') ent += parseFloat(t.valor);
          if (t.tipo === 'SAIDA') sai += parseFloat(t.valor);
        });
        setResumo({ entradas: ent.toFixed(2), saidas: sai.toFixed(2), saldo: (ent - sai).toFixed(2) });
      }
      
      if (resCartoes.data && tipo !== 'COMPRA_INTEGRADA') {
        setCartoes(resCartoes.data);
        if (resCartoes.data.length > 0 && !cartaoSelecionado) {
          setCartaoSelecionado(resCartoes.data[0].id);
        }
      }
      
      if (resComprasCartao.data) setFaturaCartao(resComprasCartao.data);
      if (resContas.data) setContasPagar(resContas.data);
      
      setHistoricoFatura(resHistoricoFatura.data || null);
      setSaldoDevedorMesAnterior(resDividaAnterior.data ? parseFloat(resDividaAnterior.data.saldo_restante) : 0);

    } catch (err) {
      mostrarNotificacao('Erro na conexão com o banco', 'erro');
    } finally {
      setCarregandoDados(false);
    }
  };

  useEffect(() => {
    carregarDadosCompletos();
  }, [contaAtiva, dataFiltro]);

  const calcularTotalFaturaDoMes = () => {
    const totalParcelas = faturaCartao.reduce((acc, item) => acc + parseFloat(item.valor_parcela), 0);
    return totalParcelas + saldoDevedorMesAnterior;
  };

  const obterStatusFatura = () => {
    const total = calcularTotalFaturaDoMes();
    if (total === 0) return { texto: 'Sem faturas', classe: '', atrasada: false };

    if (historicoFatura) {
      if (parseFloat(historicoFatura.saldo_restante) > 0) {
        return { texto: `PAGO PARCIAL (Restam R$ ${parseFloat(historicoFatura.saldo_restante).toFixed(2)}) 🔄`, classe: 'status-hoje', atrasada: false };
      }
      return { texto: 'Fatura Paga Total ✅', classe: 'status-pago', atrasada: false };
    }

    const hoje = new Date();
    const diaVencimentoCartao = faturaCartao[0]?.cartoes?.dia_vencimento || 10;
    const dataVencimentoFatura = new Date(dataFiltro.getFullYear(), dataFiltro.getMonth(), diaVencimentoCartao, 23, 59, 59);

    if (hoje > dataVencimentoFatura) {
      return { texto: 'FATURA VENCIDA ⚠️', classe: 'texto-fatura-atrasada', atrasada: true };
    }
    return { texto: 'Fatura em aberto', classe: '', atrasada: false };
  };

  const abrirModalPagamento = () => {
    const jaPagoAnteriormente = historicoFatura ? parseFloat(historicoFatura.valor_pago) : 0;
    const valorSugerido = calcularTotalFaturaDoMes() - jaPagoAnteriormente;
    setValorModal(valorSugerido > 0 ? valorSugerido.toFixed(2) : '0.00');
    setModalAberto(true);
  };

  const abrirModalReajuste = () => {
    setValorReajusteModal(saldoDevedorMesAnterior.toFixed(2));
    setModalReajusteAberto(true);
  };

  const confirmarPagamentoFatura = async (e) => {
    e.preventDefault();
    const totalFatura = calcularTotalFaturaDoMes();
    const valorDigitado = parseFloat(valorModal);
    const { anoMesAtual } = obterStringsFiltro();

    if (isNaN(valorDigitado) || valorDigitado <= 0) {
      mostrarNotificacao('Digite um valor válido!', 'erro');
      return;
    }

    if (valorDigitado > parseFloat(resumo.saldo)) {
      mostrarNotificacao(`Saldo insuficiente em caixa! Seu saldo atual é R$ ${parseFloat(resumo.saldo).toFixed(2)}`, 'erro');
      return;
    }

    setModalAberto(false);
    setCarregandoDados(true);

    const jaPagoAntes = historicoFatura ? parseFloat(historicoFatura.valor_pago) : 0;
    const totalPagoAteAgora = jaPagoAntes + valorDigitado;
    const saldoRestante = Math.max(0, totalFatura - totalPagoAteAgora);

    if (historicoFatura) {
      await supabase
        .from('faturas_pagas')
        .update({ valor_pago: totalPagoAteAgora, saldo_restante: saldoRestante })
        .eq('id', historicoFatura.id);
    } else {
      await supabase
        .from('faturas_pagas')
        .insert([{ conta: contaAtiva, ano_mes: anoMesAtual, valor_total: totalFatura, valor_pago: valorDigitado, saldo_restante: saldoRestante }]);
    }

    await supabase.from('financas').insert([{
      descricao: `Pagamento Fatura Cartão (${valorDigitado === totalFatura ? 'Total' : 'Parcial'})`,
      valor: valorDigitado,
      tipo: 'SAIDA',
      conta: contaAtiva,
      categoria: 'Moradia/Contas'
    }]);

    mostrarNotificacao(saldoRestante > 0 ? `Pago! R$ ${saldoRestante.toFixed(2)} rolarão quando o mês virar.` : 'Fatura quitada por completo!');
    carregarDadosCompletos();
  };

  const aplicarReajusteJuros = async (e) => {
    e.preventDefault();
    const novoValorReajustado = parseFloat(valorReajusteModal);
    const { anoMesAnterior } = obterStringsFiltro();

    if (isNaN(novoValorReajustado) || novoValorReajustado < 0) {
      mostrarNotificacao('Digite um valor válido!', 'erro');
      return;
    }

    setModalReajusteAberto(false);
    setCarregandoDados(true);

    const { data: checkMesAnt } = await supabase
      .from('faturas_pagas')
      .select('*')
      .eq('conta', contaAtiva)
      .eq('ano_mes', anoMesAnterior)
      .maybeSingle();

    if (checkMesAnt) {
      await supabase
        .from('faturas_pagas')
        .update({ saldo_restante: novoValorReajustado })
        .eq('id', checkMesAnt.id);
    } else {
      await supabase
        .from('faturas_pagas')
        .insert([{ conta: contaAtiva, ano_mes: anoMesAnterior, valor_total: saldoDevedorMesAnterior, valor_pago: 0, saldo_restante: novoValorReajustado }]);
    }

    mostrarNotificacao('Saldo devedor com juros atualizado!');
    carregarDadosCompletos();
  };

  // HANDLER DO FORMULÁRIO DE ENTRADAS/SAÍDAS E COMPRAS
  const handleNovoLancamento = async (e) => {
    e.preventDefault();
    setSalvando(true);

    const valorLancamento = parseFloat(valor);

    // COMPRA INTEGRADA (CASA OU LOJA)
    if (tipo === 'COMPRA_INTEGRADA') {
      const tagDestino = destinoCompra === 'LOJA' ? '[🛒 Compra Loja]' : '[🏠 Compra Casa]';
      const descricaoFinal = `${tagDestino} ${descricao}`;

      if (meioPagamento === 'DINHEIRO') {
        // Obter saldo em tempo real da conta que vai pagar antes de aprovar
        const { data: transacoesConta } = await supabase.from('financas').select('valor, tipo').eq('conta', responsavelPagamento);
        let saldoDisponivel = 0;
        if (transacoesConta) {
          transacoesConta.forEach(t => {
            if (t.tipo === 'ENTRADA') saldoDisponivel += parseFloat(t.valor);
            if (t.tipo === 'SAIDA') saldoDisponivel -= parseFloat(t.valor);
          });
        }

        if (valorLancamento > saldoDisponivel) {
          mostrarNotificacao(`Saldo Insuficiente na conta de ${responsavelPagamento}! Saldo atual: R$ ${saldoDisponivel.toFixed(2)}`, 'erro');
          setSalvando(false);
          return;
        }

        const { error } = await supabase.from('financas').insert([{
          descricao: descricaoFinal,
          valor: valorLancamento,
          tipo: 'SAIDA',
          conta: responsavelPagamento,
          categoria: categoria
        }]);

        setSalvando(false);
        if (error) mostrarNotificacao(error.message, 'erro');
        else { mostrarNotificacao('Compra registrada em dinheiro com sucesso!'); setDescricao(''); setValor(''); carregarDadosCompletos(); }

      } else if (meioPagamento === 'CREDITO') {
        if (!cartaoSelecionado) { mostrarNotificacao(`Cadastre um cartão no perfil de ${responsavelPagamento} primeiro!`, 'erro'); setSalvando(false); return; }

        const cardObj = cartoes.find(c => c.id === parseInt(cartaoSelecionado));
        const diaVenc = cardObj ? parseInt(cardObj.dia_vencimento) : 10;
        const qtdParcelas = parseInt(parcelas);
        const valorDaParcela = (valorLancamento / qtdParcelas).toFixed(2);
        const listaParcelasAInserir = [];
        
        // --- LÓGICA DE FECHAMENTO DE FATURA (7 DIAS ANTES) ---
        const dataAtual = new Date();
        let mesFaturaInicial = dataAtual.getMonth();
        let anoFaturaInicial = dataAtual.getFullYear();

        let dataFechamento = new Date(anoFaturaInicial, mesFaturaInicial, diaVenc);
        dataFechamento.setDate(dataFechamento.getDate() - 7);

        // Se a compra foi feita na data de fechamento ou depois, vai pro mês seguinte
        if (dataAtual >= dataFechamento) {
          mesFaturaInicial += 1;
        }
        // -------------------------------------------------------

        for (let i = 1; i <= qtdParcelas; i++) {
          const dataParcela = new Date(anoFaturaInicial, mesFaturaInicial + (i - 1), diaVenc);
          listaParcelasAInserir.push({
            descricao: descricaoFinal,
            valor_total: valorLancamento,
            parcelas_totais: qtdParcelas,
            parcela_atual: i,
            valor_parcela: parseFloat(valorDaParcela),
            data_vencimento_parcela: dataParcela.toISOString().split('T')[0],
            cartao_id: parseInt(cartaoSelecionado),
            conta_vinculada: responsavelPagamento
          });
        }

        const { error } = await supabase.from('compras_cartao').insert(listaParcelasAInserir);
        setSalvando(false);
        if (error) mostrarNotificacao(error.message, 'erro');
        else { mostrarNotificacao(`Compra em crédito dividida em ${qtdParcelas}x registrada!`); setDescricao(''); setValor(''); setParcelas('1'); carregarDadosCompletos(); }
      }
      return;
    }

    // FLUXOS TRADICIONAIS DO SISTEMA
    if (tipo === 'CARTAO') {
      const { error } = await supabase
        .from('cartoes')
        .insert([{ nome_cartao: descricao, dia_vencimento: parseInt(diaVencimento), conta_vinculada: contaAtiva }]);
      
      setSalvando(false);
      if (error) mostrarNotificacao(error.message, 'erro');
      else { mostrarNotificacao('💳 Cartão cadastrado!'); setDescricao(''); setDiaVencimento(''); carregarDadosCompletos(); }

    } else if (tipo === 'LANCAR_CARTAO') {
      if (!cartaoSelecionado) { mostrarNotificacao('Cadastre um cartão primeiro!', 'erro'); setSalvando(false); return; }
      const cardObj = cartoes.find(c => c.id === parseInt(cartaoSelecionado));
      const diaVenc = cardObj ? parseInt(cardObj.dia_vencimento) : 10;
      const qtdParcelas = parseInt(parcelas);
      const valorDaParcela = (valorLancamento / qtdParcelas).toFixed(2);
      const listaParcelasAInserir = [];

      // --- LÓGICA DE FECHAMENTO DE FATURA (7 DIAS ANTES) ---
      const dataAtual = new Date();
      let mesFaturaInicial = dataAtual.getMonth();
      let anoFaturaInicial = dataAtual.getFullYear();

      let dataFechamento = new Date(anoFaturaInicial, mesFaturaInicial, diaVenc);
      dataFechamento.setDate(dataFechamento.getDate() - 7);

      // Se a compra foi feita na data de fechamento ou depois, vai pro mês seguinte
      if (dataAtual >= dataFechamento) {
        mesFaturaInicial += 1;
      }
      // -------------------------------------------------------

      for (let i = 1; i <= qtdParcelas; i++) {
        const dataParcela = new Date(anoFaturaInicial, mesFaturaInicial + (i - 1), diaVenc);
        listaParcelasAInserir.push({
          descricao: descricao,
          valor_total: valorLancamento,
          parcelas_totais: qtdParcelas,
          parcela_atual: i,
          valor_parcela: parseFloat(valorDaParcela),
          data_vencimento_parcela: dataParcela.toISOString().split('T')[0],
          cartao_id: parseInt(cartaoSelecionado),
          conta_vinculada: contaAtiva
        });
      }

      const { error } = await supabase.from('compras_cartao').insert(listaParcelasAInserir);
      setSalvando(false);
      if (error) mostrarNotificacao(error.message, 'erro');
      else { mostrarNotificacao(`Compra dividida em ${qtdParcelas}x no cartão!`); setDescricao(''); setValor(''); setParcelas('1'); carregarDadosCompletos(); }

    } else if (tipo === 'CONTAPAGAR') {
      const { error } = await supabase
        .from('contas_pagar')
        .insert([{ descricao, valor: valorLancamento, data_vencimento: dataVencimento, conta_vinculada: contaAtiva, status: 'PENDENTE', recorrente }]);

      setSalvando(false);
      if (error) mostrarNotificacao(error.message, 'erro');
      else { mostrarNotificacao('Conta salva no mural!'); setDescricao(''); setValor(''); setDataVencimento(''); setRecorrente(false); carregarDadosCompletos(); }

    } else if (tipo === 'TRANSFERENCIA') {
      const { error } = await supabase.from('financas').insert([
        { descricao: `[Transf. Enviada] ${descricao}`, valor: valorLancamento, tipo: 'SAIDA', conta: contaAtiva, categoria: 'Transferência' },
        { descricao: `[Transf. Recebida] ${descricao}`, valor: valorLancamento, tipo: 'ENTRADA', conta: contaDestino, categoria: 'Transferência' }
      ]);
      setSalvando(false);
      if (error) mostrarNotificacao(error.message, 'erro');
      else { mostrarNotificacao('🔄 Transferência concluída!'); setDescricao(''); setValor(''); carregarDadosCompletos(); }

    } else {
      const { error } = await supabase.from('financas').insert([{ descricao, valor: valorLancamento, tipo, conta: contaAtiva, categoria }]);
      setSalvando(false);
      if (error) mostrarNotificacao(error.message, 'erro');
      else { mostrarNotificacao('Movimentação registrada!'); setDescricao(''); setValor(''); carregarDadosCompletos(); }
    }
  };

  const pagarContaAvulsa = async (conta) => {
    if (parseFloat(conta.valor) > parseFloat(resumo.saldo)) {
      mostrarNotificacao(`Saldo insuficiente! Você precisa de R$ ${parseFloat(conta.valor).toFixed(2)} mas só tem R$ ${parseFloat(resumo.saldo).toFixed(2)}`, 'erro');
      return;
    }

    if (window.confirm(`Pagar a conta "${conta.descricao}"?`)) {
      setCarregandoDados(true);
      await supabase.from('contas_pagar').update({ status: 'PAGO' }).eq('id', conta.id);
      
      await supabase.from('financas').insert([{
        descricao: `[Pago] ${conta.descricao}`,
        valor: conta.valor,
        tipo: 'SAIDA',
        conta: contaAtiva,
        categoria: 'Moradia/Contas'
      }]);

      if (conta.recorrente) {
        const dataOriginal = new Date(conta.data_vencimento + 'T12:00:00'); 
        const dataProximoMes = new Date(dataOriginal.getFullYear(), dataOriginal.getMonth() + 1, dataOriginal.getDate());

        await supabase.from('contas_pagar').insert([{
          descricao: conta.descricao,
          valor: conta.valor,
          data_vencimento: dataProximoMes.toISOString().split('T')[0],
          conta_vinculada: contaAtiva,
          status: 'PENDENTE',
          recorrente: true
        }]);
        mostrarNotificacao('Pago! Lançamento criado para o mês seguinte 🔁');
      } else {
        mostrarNotificacao('Conta paga e debitada do saldo!');
      }

      carregarDadosCompletos();
    }
  };

  const deletarLancamentoGeral = async (tabela, id) => {
    const msg = tabela === 'cartoes' ? 'Apagar o cartão excluirá seus parcelamentos. Continuar?' : 'Excluir registro permanentemente?';
    if (window.confirm(msg)) {
      await supabase.from(tabela).delete().eq('id', id);
      mostrarNotificacao('Excluído.');
      carregarDadosCompletos();
    }
  };

  const calcularStatusEClasse = (conta) => {
    if (conta.status === 'PAGO') return { texto: 'PAGO', classe: 'status-pago' };
    const hojeStr = new Date().toISOString().split('T')[0];
    const vencimentoStr = conta.data_vencimento;
    if (vencimentoStr === hojeStr) return { texto: 'VENCE HOJE', classe: 'status-hoje' };
    if (vencimentoStr < hojeStr) return { texto: 'VENCIDA', classe: 'status-vencida' };
    return { texto: 'PENDENTE', classe: 'status-pendente' };
  };

  const obterNomeMesFiltroExtenso = () => {
    return dataFiltro.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const statusFatura = obterStatusFatura();

  return (
    <div>
      <button className="btn-voltar" onClick={() => setSistemaAtivo('HOME')}>
        🏠 Voltar ao Orgapp
      </button>

      {/* 1. MODAL DE PAGAMENTO DE FATURA */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
          <div className="card-app" style={{ width: '100%', maxWidth: '360px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#7c3aed', fontSize: '18px', fontWeight: '800' }}>Pagar Fatura 💳</h3>
            <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '13px' }}>Digite o valor do pagamento para abater na fatura.</p>
            <form onSubmit={confirmarPagamentoFatura} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="number" step="0.01" value={valorModal} onChange={(e) => setValorModal(e.target.value)} className="input-padrao" style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed', textAlign: 'center' }} required />
              <button type="button" onClick={() => { const jaPago = historicoFatura ? parseFloat(historicoFatura.valor_pago) : 0; setValorModal((calcularTotalFaturaDoMes() - jaPago).toFixed(2)); }} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'right' }}>Preencher Valor Restante</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#7c3aed', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL DE REAJUSTE DE JUROS */}
      {modalReajusteAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
          <div className="card-app" style={{ width: '100%', maxWidth: '360px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#b91c1c', fontSize: '18px', fontWeight: '800' }}>Reajustar Saldo Devedor 📈</h3>
            <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '13px' }}>Insira o novo valor corrigido com os juros cobrados pelo banco.</p>
            <form onSubmit={aplicarReajusteJuros} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="number" step="0.01" value={valorReajusteModal} onChange={(e) => setValorReajusteModal(e.target.value)} className="input-padrao" style={{ fontSize: '18px', fontWeight: '700', color: '#b91c1c', textAlign: 'center' }} required />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setModalReajusteAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#b91c1c', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Aplicar Juros</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALENDÁRIO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <button onClick={retrocederMes} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', color: '#1e3a8a' }}>◀</button>
        <div style={{ textAlign: 'center' }}>
          <small style={{ color: '#6b7280', fontWeight: '700', fontSize: '11px', letterSpacing: '0.5px' }}>MÊS DE COMPETÊNCIA</small>
          <div style={{ color: '#1e3a8a', margin: 0, fontSize: '16px', fontWeight: '800', marginTop: '2px' }}>{obterNomeMesFiltroExtenso()}</div>
        </div>
        <button onClick={avancarMes} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', color: '#1e3a8a' }}>▶</button>
      </div>

      {/* SELETOR DE CONTAS DE VISUALIZAÇÃO */}
      <div className="seletor-contas">
        <button className="btn-conta" style={{ borderColor: contaAtiva === 'KELVIN' ? '#1e3a8a' : '#e5e7eb', backgroundColor: contaAtiva === 'KELVIN' ? '#eff6ff' : '#fff', color: contaAtiva === 'KELVIN' ? '#1e3a8a' : '#4b5563' }} onClick={() => setContaAtiva('KELVIN')}>👤 Kelvin</button>
        <button className="btn-conta" style={{ borderColor: contaAtiva === 'LORRAINE' ? '#db2777' : '#e5e7eb', backgroundColor: contaAtiva === 'LORRAINE' ? '#fdf2f8' : '#fff', color: contaAtiva === 'LORRAINE' ? '#db2777' : '#4b5563' }} onClick={() => setContaAtiva('LORRAINE')}>👩🏻‍💼 Lorraine</button>
        <button className="btn-conta" style={{ borderColor: contaAtiva === 'EMPRESA' ? '#ea580c' : '#e5e7eb', backgroundColor: contaAtiva === 'EMPRESA' ? '#fff7ed' : '#fff', color: contaAtiva === 'EMPRESA' ? '#ea580c' : '#4b5563' }} onClick={() => setContaAtiva('EMPRESA')}>🏪 Empresa</button>
      </div>

      {/* BALANÇO DO MÊS */}
      <div className="card-resumo-financeiro">
        <div className="mini-card"><small style={{ color: '#6b7280', fontWeight: '600' }}>Entradas</small><div className="texto-entrada">R$ {resumo.entradas}</div></div>
        <div className="mini-card"><small style={{ color: '#6b7280', fontWeight: '600' }}>Saídas</small><div className="texto-saida">R$ {resumo.saidas}</div></div>
        <div className="mini-card" style={{ backgroundColor: parseFloat(resumo.saldo) >= 0 ? '#f0fdf4' : '#fef2f2' }}><small style={{ color: '#6b7280', fontWeight: '600' }}>Saldo do Mês</small><div style={{ fontWeight: '800', color: parseFloat(resumo.saldo) >= 0 ? '#16a34a' : '#dc2626' }}>R$ {resumo.saldo}</div></div>
      </div>

      <div className="grid-layout">
        {/* FORMULÁRIO GERAL */}
        <section className="card-app">
          <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700' }}>Novo Lançamento</h3>
          <form onSubmit={handleNovoLancamento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Abas Superiores Expandidas com a nova opção de Compra */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
              <button type="button" onClick={() => setTipo('ENTRADA')} style={{ padding: '6px 1px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '9px', backgroundColor: tipo === 'ENTRADA' ? '#10b981' : 'transparent', color: tipo === 'ENTRADA' ? '#fff' : '#4b5563', cursor: 'pointer' }}>Entrada</button>
              <button type="button" onClick={() => setTipo('SAIDA')} style={{ padding: '6px 1px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '9px', backgroundColor: tipo === 'SAIDA' ? '#ef4444' : 'transparent', color: tipo === 'SAIDA' ? '#fff' : '#4b5563', cursor: 'pointer' }}>Saída</button>
              <button type="button" onClick={() => setTipo('COMPRA_INTEGRADA')} style={{ padding: '6px 1px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '9px', backgroundColor: tipo === 'COMPRA_INTEGRADA' ? '#f59e0b' : 'transparent', color: tipo === 'COMPRA_INTEGRADA' ? '#fff' : '#4b5563', cursor: 'pointer' }}>🛒 Compra</button>
              <button type="button" onClick={() => setTipo('TRANSFERENCIA')} style={{ padding: '6px 1px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '9px', backgroundColor: tipo === 'TRANSFERENCIA' ? '#2563eb' : 'transparent', color: tipo === 'TRANSFERENCIA' ? '#fff' : '#4b5563', cursor: 'pointer' }}>Transf.</button>
              <button type="button" onClick={() => setTipo('LANCAR_CARTAO')} style={{ padding: '6px 1px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '9px', backgroundColor: tipo === 'LANCAR_CARTAO' ? '#7c3aed' : 'transparent', color: tipo === 'LANCAR_CARTAO' ? '#fff' : '#4b5563', cursor: 'pointer' }}>Gasto CC</button>
              <button type="button" onClick={() => setTipo('CONTAPAGAR')} style={{ padding: '6px 1px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '9px', backgroundColor: tipo === 'CONTAPAGAR' ? '#db2777' : 'transparent', color: tipo === 'CONTAPAGAR' ? '#fff' : '#4b5563', cursor: 'pointer' }}>📄 Boleto</button>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={() => setTipo('CARTAO')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>+ Cadastrar Cartão Físico</button>
            </div>

            {/* SEÇÃO DINÂMICA: FORMULÁRIO DE COMPRAS INTEGRADO */}
            {tipo === 'COMPRA_INTEGRADA' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '4px' }}>DESTINO DA COMPRA</label>
                  <select value={destinoCompra} onChange={(e) => setDestinoCompra(e.target.value)} className="select-padrao">
                    <option value="CASA">🏠 Para Casa</option>
                    <option value="LOJA">🏪 Para a Loja (Mimos Doces)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '4px' }}>QUEM VAI PAGAR?</label>
                  <select value={responsavelPagamento} onChange={(e) => setResponsavelPagamento(e.target.value)} className="select-padrao">
                    {destinoCompra === 'LOJA' && <option value="EMPRESA">Caixa da Empresa</option>}
                    <option value="KELVIN">Kelvin</option>
                    <option value="LORRAINE">Lorraine</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '4px' }}>COMO VAMOS PAGAR?</label>
                  <select value={meioPagamento} onChange={(e) => setMeioPagamento(e.target.value)} className="select-padrao">
                    <option value="DINHEIRO">💵 Dinheiro em Conta (Débito/Pix)</option>
                    <option value="CREDITO">💳 Cartão de Crédito</option>
                  </select>
                </div>

                {meioPagamento === 'CREDITO' && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '4px' }}>SELECIONE O CARTÃO</label>
                      <select value={cartaoSelecionado} onChange={(e) => setCartaoSelecionado(e.target.value)} className="select-padrao">
                        {cartoes.length === 0 ? <option value="">Sem cartões cadastrados para este perfil</option> : cartoes.map(c => <option key={c.id} value={c.id}>{c.nome_cartao} (venc. {c.dia_vencimento})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', display: 'block', marginBottom: '4px' }}>PARCELAMENTO</label>
                      <select value={parcelas} onChange={(e) => setParcelas(e.target.value)} className="select-padrao">
                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SELETORES DOS FLUXOS TRADICIONAIS */}
            {tipo === 'TRANSFERENCIA' && (
              <select value={contaDestino} onChange={(e) => setContaDestino(e.target.value)} className="select-padrao">
                {contaAtiva !== 'KELVIN' && <option value="KELVIN">Kelvin</option>}
                {contaAtiva !== 'LORRAINE' && <option value="LORRAINE">Lorraine</option>}
                {contaAtiva !== 'EMPRESA' && <option value="EMPRESA">Empresa</option>}
              </select>
            )}

            {tipo === 'LANCAR_CARTAO' && (
              <>
                <select value={cartaoSelecionado} onChange={(e) => setCartaoSelecionado(e.target.value)} className="select-padrao">
                  {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome_cartao} (venc. {c.dia_vencimento})</option>)}
                </select>
                <select value={parcelas} onChange={(e) => setParcelas(e.target.value)} className="select-padrao">
                  {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Parcelar em {i+1}x</option>)}
                </select>
              </>
            )}

            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === 'CARTAO' ? "Nome do Banco (ex: Nubank)" : tipo === 'CONTAPAGAR' ? "Nome do Boleto (ex: Cemig)" : tipo === 'COMPRA_INTEGRADA' ? "O que comprou? (ex: Embalagens ou Supermercado)" : "Descrição"} className="input-padrao" required />
            {tipo !== 'CARTAO' && ( <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === 'LANCAR_CARTAO' || (tipo === 'COMPRA_INTEGRADA' && meioPagamento === 'CREDITO') ? "Valor TOTAL" : "R$ Valor"} className="input-padrao" required /> )}
            {tipo === 'CARTAO' && ( <input type="number" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} placeholder="Dia de Vencimento Fixo (ex: 10)" className="input-padrao" min="1" max="31" required /> )}
            
            {tipo === 'CONTAPAGAR' && (
              <>
                <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} className="input-padrao" required />
                <label className="checkbox-container"><input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} /> 🔁 Conta Fixa Recorrente</label>
              </>
            )}

            <button type="submit" disabled={salvando} style={{ width: '100%', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', backgroundColor: tipo === 'COMPRA_INTEGRADA' ? '#f59e0b' : tipo === 'CARTAO' || tipo === 'LANCAR_CARTAO' ? '#7c3aed' : tipo === 'CONTAPAGAR' ? '#db2777' : tipo === 'TRANSFERENCIA' ? '#2563eb' : '#1e3a8a' }}>{salvando ? 'Processando...' : 'Confirmar Lançamento'}</button>
          </form>
        </section>

        {/* EXTRATO DE CAIXA */}
        <section className="card-app">
          <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Extrato de Caixa ({contaAtiva})</h3>
          <div className="lista-transacoes">
            {transacoes.map((t) => (
              <div key={t.id} className="item-transacao">
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{t.descricao}</div>
                  <small style={{ color: '#9ca3af' }}>{t.categoria} • {new Date(t.data_lancamento).toLocaleDateString('pt-BR')}</small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: '800', color: t.tipo === 'ENTRADA' ? '#10b981' : '#ef4444' }}>{t.tipo === 'ENTRADA' ? '+' : '-'} R$ {parseFloat(t.valor).toFixed(2)}</span>
                  <button onClick={() => deletarLancamentoGeral('financas', t.id)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* SEÇÃO INFERIOR */}
      <div className="secao-interna-financas">
        
        {/* FATURA CARTÃO */}
        <section className="card-app">
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px', color: '#7c3aed' }}>💳 Fatura de Cartão de Crédito ({contaAtiva})</h3>
          
          {calcularTotalFaturaDoMes() > 0 && (
            <div className="bloco-fatura-total">
              <div>
                <small style={{ color: '#6b7280', fontWeight: '700' }}>TOTAL DA FATURA:</small>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#6b21a8', marginTop: '2px' }}>R$ {calcularTotalFaturaDoMes().toFixed(2)}</div>
                
                {saldoDevedorMesAnterior > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <small style={{ color: '#dc2626', fontWeight: '700', display: 'block' }}>
                      (Rolado do mês anterior: R$ {saldoDevedorMesAnterior.toFixed(2)})
                    </small>
                    <button type="button" onClick={abrirModalReajuste} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: 0, textDecoration: 'underline', marginTop: '2px' }}>
                      ⚙️ Reajustar Saldo Devedor (Adicionar Juros)
                    </button>
                  </div>
                )}

                <span className={`badge-status ${statusFatura.classe || 'status-pendente'}`} style={{ display: 'inline-block', marginTop: '8px' }}>
                  {statusFatura.texto}
                </span>
              </div>
              {(!historicoFatura || parseFloat(historicoFatura.saldo_restante) > 0) && (
                <button onClick={abrirModalPagamento} style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>Pagar Fatura</button>
              )}
            </div>
          )}

          {faturaCartao.length === 0 && saldoDevedorMesAnterior === 0 ? <p style={{ fontSize: '13px', color: '#9ca3af' }}>Nenhuma parcela este mês.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {saldoDevedorMesAnterior > 0 && (
                <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#b91c1c', fontWeight: '600' }}>
                  🔄 Dívida acumulada rotativa: R$ {saldoDevedorMesAnterior.toFixed(2)}
                </div>
              )}
              {faturaCartao.map(fc => (
                <div key={fc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}>
                  <div>
                    <strong>{fc.descricao}</strong> <span className="texto-parcela">{fc.parcela_atual}/{fc.parcelas_totais}x</span>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Cartão: {fc.cartoes?.nome_cartao}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '700', color: '#6b21a8' }}>R$ {fc.valor_parcela.toFixed(2)}</span>
                    <button onClick={() => deletarLancamentoGeral('compras_cartao', fc.id)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LISTA DE BOLETOS */}
        <section className="card-app">
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px', color: '#db2777' }}>📄 Boletos e Contas a Pagar ({contaAtiva})</h3>
          {contasPagar.length === 0 ? <p style={{ fontSize: '13px', color: '#9ca3af' }}>Nenhuma conta agendada.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contasPagar.map(conta => {
                const infoStatus = calcularStatusEClasse(conta);
                return (
                  <div key={conta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{conta.descricao} {conta.recorrente && '🔁'}</div>
                      <small style={{ color: '#6b7280' }}>Vence em: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} • R$ {parseFloat(conta.valor).toFixed(2)}</small>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className={`badge-status ${infoStatus.classe}`}>{infoStatus.texto}</span>
                      {conta.status === 'PENDENTE' && <button className="btn-acao-tabela" onClick={() => pagarContaAvulsa(conta)}>Pagar</button>}
                      <button onClick={() => deletarLancamentoGeral('contas_pagar', conta.id)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
// Fim do componente Financas.jsx