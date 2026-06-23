import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Compras({ setSistemaAtivo, mostrarNotificacao }) {
  const [abaAtual, setAbaAtual] = useState('NOVA');

  // Estados do Cadastro Fixo Expandido
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novoItemMarca, setNovoItemMarca] = useState('');
  const [novoItemPreco, setNovoItemPreco] = useState('');
  const [novoItemTamanho, setNovoItemTamanho] = useState('');
  const [novoItemUnidade, setNovoItemUnidade] = useState('G'); 
  const [novoItemCategoria, setNovoItemCategoria] = useState('Alimentos');
  const [novoItemDestino, setNovoItemDestino] = useState('CASA'); 
  const [cadastrandoFixo, setCadastrandoFixo] = useState(false);
  const [bancoProdutos, setBancoProdutos] = useState([]);
  const [modoEdicaoId, setModoEdicaoId] = useState(null); 
  
  // Controla a exibição da telinha flutuante de cadastro/edição
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);

  // Estados da Nova Compra (Carrinho de Mercado)
  const [local, setLocal] = useState('');
  const [tipoCompra, setTipoCompra] = useState('CASA'); 
  const [itens, setItens] = useState([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [carregando, setCarregando] = useState(false);

  // ESTADOS DA LISTA DE PLANEJAMENTO
  const [itensPlanejados, setItensPlanejados] = useState([]);
  const [prodPlanejadoId, setProdPlanejadoId] = useState('');
  const [qtdPlanejada, setQtdPlanejada] = useState('');

  // Estados do Modal de Integração Financeira
  const [modalFinanceiroAberto, setModalFinanceiroAberto] = useState(false);
  const [responsavelPagamento, setResponsavelPagamento] = useState('KELVIN');
  const [meioPagamento, setMeioPagamento] = useState('DINHEIRO');
  const [cartoesDisponiveis, setCartoesDisponiveis] = useState([]);
  const [cartaoSelecionado, setCartaoSelecionado] = useState('');

  // Estados do Histórico
  const [listaCompras, setListaCompras] = useState([]);
  const [compraSelecionada, setCompraSelecionada] = useState(null);
  const [itensDaCompraSelecionada, setItensDaCompraSelecionada] = useState([]);
  const [carregandoHistorial, setCarregandoHistorial] = useState(false);

  const obterProdutosFiltrados = (destino) => {
    return bancoProdutos.filter(p => p.destino_padrao === destino || p.destino_padrao === 'AMBOS');
  };

  const buscarProdutosDoBanco = async () => {
    const { data } = await supabase.from('produtos_cadastrados').select('*').order('nome', { ascending: true });
    if (data) {
      setBancoProdutos(data);
      const filtrados = data.filter(p => p.destino_padrao === tipoCompra || p.destino_padrao === 'AMBOS');
      if (filtrados.length > 0) {
        setProdutoSelecionadoId(filtrados[0].id.toString());
        setProdPlanejadoId(filtrados[0].id.toString());
      }
    }
  };

  useEffect(() => {
    buscarProdutosDoBanco();
  }, [tipoCompra, abaAtual]);

  useEffect(() => {
    if (tipoCompra === 'LOJA') setResponsavelPagamento('EMPRESA');
    else setResponsavelPagamento('KELVIN');
  }, [tipoCompra]);

  useEffect(() => {
    if (modalFinanceiroAberto) buscarCartoesDoPagador();
  }, [responsavelPagamento, modalFinanceiroAberto]);

  const buscarCartoesDoPagador = async () => {
    const { data } = await supabase.from('cartoes').select('*').eq('conta_vinculada', responsavelPagamento);
    if (data) {
      setCartoesDisponiveis(data);
      if (data.length > 0) setCartaoSelecionado(data[0].id);
      else setCartaoSelecionado('');
    }
  };

  const iniciarEdicaoInsumo = (produto) => {
    setModoEdicaoId(produto.id);
    setNovoItemNome(produto.nome);
    setNovoItemMarca(produto.marca === 'Sem Marca' ? '' : produto.marca);
    setNovoItemPreco(produto.preco_base.toString());
    setNovoItemTamanho(produto.tamanho_embalagem.toString());
    setNovoItemUnidade(produto.unidade_medida);
    setNovoItemCategoria(produto.categoria);
    setNovoItemDestino(produto.destino_padrao);
    setModalCadastroAberto(true);
  };

  const cancelarEdicao = () => {
    setModoEdicaoId(null);
    setNovoItemNome('');
    setNovoItemMarca('');
    setNovoItemPreco('');
    setNovoItemTamanho('');
    setNovoItemUnidade('G');
    setNovoItemCategoria('Alimentos');
    setNovoItemDestino('CASA');
    setModalCadastroAberto(false);
  };

  const handleCadastrarItemFixo = async (e) => {
    e.preventDefault();
    if (!novoItemNome || !novoItemPreco || !novoItemTamanho) return;

    setCadastrandoFixo(true);
    const marcaFinal = novoItemMarca || 'Sem Marca';

    const itemExistente = modoEdicaoId 
      ? bancoProdutos.find(p => p.id === modoEdicaoId)
      : bancoProdutos.find(p => p.nome.toLowerCase() === novoItemNome.toLowerCase() && p.marca.toLowerCase() === marcaFinal.toLowerCase());

    if (itemExistente) {
      const { error } = await supabase
        .from('produtos_cadastrados')
        .update({
          nome: novoItemNome,
          marca: marcaFinal,
          preco_base: parseFloat(novoItemPreco),
          tamanho_embalagem: parseFloat(novoItemTamanho),
          unidade_medida: novoItemUnidade,
          categoria: novoItemCategoria,
          destino_padrao: novoItemDestino
        })
        .eq('id', itemExistente.id);

      setCadastrandoFixo(false);
      if (error) {
        mostrarNotificacao('Erro ao atualizar: ' + error.message, 'erro');
      } else {
        mostrarNotificacao(`Item "${novoItemNome}" atualizado com sucesso! 👍`);
        cancelarEdicao();
        buscarProdutosDoBanco();
      }
    } else {
      const { error } = await supabase
        .from('produtos_cadastrados')
        .insert([{ 
          nome: novoItemNome, 
          marca: marcaFinal,
          preco_base: parseFloat(novoItemPreco),
          tamanho_embalagem: parseFloat(novoItemTamanho),
          unidade_medida: novoItemUnidade,
          categoria: novoItemCategoria, 
          destino_padrao: novoItemDestino 
        }]);

      setCadastrandoFixo(false);
      if (error) {
        mostrarNotificacao('Erro ao cadastrar: ' + error.message, 'erro');
      } else {
        mostrarNotificacao('Novo insumo registrado com sucesso!');
        cancelarEdicao();
        buscarProdutosDoBanco();
      }
    }
  };

  const deletarInsumoDoBanco = async (id, nome) => {
    if (window.confirm(`Deseja excluir permanentemente o item "${nome}" do seu catálogo?`)) {
      const { error } = await supabase.from('produtos_cadastrados').delete().eq('id', id);
      if (error) {
        mostrarNotificacao('Erro ao deletar insumo: ' + error.message, 'erro');
      } else {
        mostrarNotificacao('Item removido do catálogo!');
        if (modoEdicaoId === id) cancelarEdicao();
        buscarProdutosDoBanco();
        if (produtoSelecionadoId === id.toString()) setProdutoSelecionadoId('');
        if (prodPlanejadoId === id.toString()) setProdPlanejadoId('');
      }
    }
  };

  const adicionarItemNaLista = async (e) => {
    if (e) e.preventDefault();
    if (!quantidade) {
      mostrarNotificacao('Informe a quantidade!', 'erro');
      return;
    }
    if (!produtoSelecionadoId) {
      mostrarNotificacao('Selecione o produto do catálogo!', 'erro');
      return;
    }

    const prod = bancoProdutos.find(p => p.id === parseInt(produtoSelecionadoId));
    if (!prod) return;

    let precoFinal = prod.preco_base || 0;
    let deveAtualizarBanco = false;

    if (valorUnitario !== '' && parseFloat(valorUnitario) !== prod.preco_base) {
      precoFinal = parseFloat(valorUnitario);
      deveAtualizarBanco = true;
    }

    const novoItem = {
      id_interno: Date.now() + Math.random(),
      produto_id: prod.id,
      produto: `${prod.nome} (${prod.marca}) - ${prod.tamanho_embalagem}${prod.unidade_medida.toLowerCase()}`,
      quantidade: parseFloat(quantidade),
      valor_unitario: precoFinal,
      categoria: prod.categoria
    };

    setItens([...itens, novoItem]);
    setQuantidade('');
    setValorUnitario('');

    if (deveAtualizarBanco) {
      await supabase.from('produtos_cadastrados').update({ preco_base: precoFinal }).eq('id', prod.id);
      mostrarNotificacao(`Preço reajustado no catálogo para R$ ${precoFinal.toFixed(2)} ⚙️`);
    } else {
      mostrarNotificacao('Adicionado usando preço base cadastrado!');
    }
  };

  const removerItemDoCarrinho = (idInterno) => {
    setItens(itens.filter(item => item.id_interno !== idInterno));
    mostrarNotificacao('Item removido do carrinho.');
  };

  const adicionarItemPlanejado = (e) => {
    e.preventDefault();
    if (!qtdPlanejada) {
      mostrarNotificacao('Informe a quantidade necessária!', 'erro');
      return;
    }
    if (!prodPlanejadoId) return;

    const prod = bancoProdutos.find(p => p.id === parseInt(prodPlanejadoId));
    if (!prod) return;

    const jaExiste = itensPlanejados.some(item => item.produto_id === prod.id);
    if (jaExiste) {
      mostrarNotificacao('Item já está na sua lista de planejamento!', 'erro');
      return;
    }

    setItensPlanejados([...itensPlanejados, {
      id_interno: Date.now() + Math.random(),
      produto_id: prod.id,
      nome: prod.nome,
      marca: prod.marca,
      especificacao: `${prod.tamanho_embalagem}${prod.unidade_medida.toLowerCase()}`,
      quantidade: parseFloat(qtdPlanejada),
      categoria: prod.categoria,
      preco_base: prod.preco_base
    }]);

    setQtdPlanejada('');
    mostrarNotificacao('Anotado na lista de faltas! 📝');
  };

  const moverPlanejadoParaCarrinho = async (item, precoDigitado) => {
    let precoFinal = item.preco_base || 0;
    let deveAtualizarBanco = false;

    if (precoDigitado !== '' && parseFloat(precoDigitado) > 0) {
      precoFinal = parseFloat(precoDigitado);
      if (item.produto_id && precoFinal !== item.preco_base) {
        deveAtualizarBanco = true;
      }
    }

    const novoItem = {
      id_interno: Date.now() + Math.random(),
      produto_id: item.produto_id,
      produto: `${item.nome} (${item.marca}) - ${item.especificacao}`,
      quantidade: item.quantidade,
      valor_unitario: precoFinal,
      categoria: item.categoria
    };

    setItens([...itens, novoItem]);
    setItensPlanejados(itensPlanejados.filter(p => p.id_interno !== item.id_interno));

    if (deveAtualizarBanco) {
      await supabase.from('produtos_cadastrados').update({ preco_base: precoFinal }).eq('id', item.produto_id);
      mostrarNotificacao('Pegou! Preço atualizado no catálogo.');
    } else {
      mostrarNotificacao('Item jogado para o carrinho!');
    }
  };

  const calcularTotalGeral = () => {
    return itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0).toFixed(2);
  };

  const handleIniciarFechamento = () => {
    if (!local || itens.length === 0) {
      mostrarNotificacao('Insira o local e os itens!', 'erro');
      return;
    }
    setModalFinanceiroAberto(true);
  };

  const salvarCompraNoBancoGeral = async (e) => {
    e.preventDefault();
    setModalFinanceiroAberto(false);
    setCarregando(true);

    const total = parseFloat(calcularTotalGeral());
    const descricaoFinanceira = `[🛒 Carrinho] ${local} (${itens.length} itens)`;

    if (meioPagamento === 'DINHEIRO') {
      const { data: transacoesConta } = await supabase.from('financas').select('valor, tipo').eq('conta', responsavelPagamento);
      let saldoDisponivel = 0;
      if (transacoesConta) {
        transacoesConta.forEach(t => {
          if (t.tipo === 'ENTRADA') saldoDisponivel += parseFloat(t.valor);
          if (t.tipo === 'SAIDA') saldoDisponivel -= parseFloat(t.valor);
        });
      }

      if (total > saldoDisponivel) {
        mostrarNotificacao(`Saldo Insuficiente! Caixa de ${responsavelPagamento} possui R$ ${saldoDisponivel.toFixed(2)}`, 'erro');
        setCarregando(false);
        return;
      }

      await supabase.from('financas').insert([{
        descricao: descricaoFinanceira,
        valor: total,
        tipo: 'SAIDA',
        conta: responsavelPagamento,
        categoria: tipoCompra === 'LOJA' ? 'Insumos/Embalagens' : 'Alimentação'
      }]);

    } else if (meioPagamento === 'CREDITO') {
      if (!cartaoSelecionado) {
        mostrarNotificacao(`Erro: Perfil sem cartão!`, 'erro');
        setCarregando(false);
        return;
      }
      const cardObj = cartoesDisponiveis.find(c => c.id === parseInt(cartaoSelecionado));
      const diaVenc = cardObj ? cardObj.dia_vencimento : 10;

      await supabase.from('compras_cartao').insert([{
        descricao: descricaoFinanceira,
        valor_total: total,
        parcelas_totais: 1,
        parcelas_atual: 1,
        valor_parcela: total,
        data_vencimento_parcela: new Date(new Date().getFullYear(), new Date().getMonth(), diaVenc).toISOString().split('T')[0],
        cartao_id: parseInt(cartaoSelecionado),
        conta_vinculada: responsavelPagamento
      }]);
    }

    const { data: compraSalva } = await supabase
      .from('compras')
      .insert([{ local_compra: local, tipo_compra: tipoCompra, valor_total: total }])
      .select();

    const compraId = compraSalva[0].id;
    
    const itensFormatados = itens.map(item => ({
      compra_id: compraId,
      produto: item.produto,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario, 
      categoria: item.categoria
    }));

    await supabase.from('itens_compra').insert(itensFormatados);
    setCarregando(false);
    mostrarNotificacao('🛒 Compra processada com sucesso!');
    setLocal('');
    setItens([]);
  };

  const buscarHistoricoCompras = async () => {
    setCarregandoHistorial(true);
    const { data, error } = await supabase.from('compras').select('*').order('data_compra', { ascending: false });
    setCarregandoHistorial(false);
    if (error) mostrarNotificacao(error.message, 'erro');
    else if (data) setListaCompras(data);
  };

  const visualizarDetalhesCompra = async (compra) => {
    setCompraSelecionada(compra);
    const { data, error } = await supabase.from('itens_compra').select('*').eq('compra_id', compra.id);
    if (error) mostrarNotificacao(error.message, 'erro');
    else if (data) setItensDaCompraSelecionada(data);
  };

  const deletarCompra = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Excluir esta lista de compras permanentemente?')) {
      await supabase.from('compras').delete().eq('id', id);
      mostrarNotificacao('Removida.');
      buscarHistoricoCompras();
      if (compraSelecionada?.id === id) setCompraSelecionada(null);
    }
  };

  useEffect(() => {
    if (abaAtual === 'HISTORICO') {
      buscarHistoricoCompras();
      setCompraSelecionada(null);
    }
  }, [abaAtual]);

  const produtosFiltradosPorDestino = obterProdutosFiltrados(tipoCompra);
  const produtoAtualEmUso = bancoProdutos.find(p => p.id === parseInt(produtoSelecionadoId));

  return (
    <div>
      {/* MODAL FINANCEIRO */}
      {modalFinanceiroAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
          <div className="card-app" style={{ width: '100%', maxWidth: '380px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: '800' }}>Pagamento da Compra 💳</h3>
            <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '13px' }}>A nota fechou em <strong style={{ color: '#16a34a' }}>R$ {calcularTotalGeral()}</strong>.</p>
            <form onSubmit={salvarCompraNoBancoGeral} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700' }}>QUEM COMPROU / VAI PAGAR?</label>
                <select value={responsavelPagamento} onChange={(e) => setResponsavelPagamento(e.target.value)} className="select-padrao">
                  {tipoCompra === 'LOJA' && <option value="EMPRESA">Empresa (Mimos Doces)</option>}
                  <option value="KELVIN">Kelvin</option>
                  <option value="LORRAINE">Lorraine</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700' }}>FORMA DE PAGAMENTO</label>
                <select value={meioPagamento} onChange={(e) => setMeioPagamento(e.target.value)} className="select-padrao">
                  <option value="DINHEIRO">💵 Dinheiro em Conta (Débito/Pix)</option>
                  <option value="CREDITO">💳 Cartão de Crédito</option>
                </select>
              </div>
              {meioPagamento === 'CREDITO' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '700' }}>SELECIONE O CARTÃO</label>
                  <select value={cartaoSelecionado} onChange={(e) => setCartaoSelecionado(e.target.value)} className="select-padrao" required>
                    {cartoesDisponiveis.length === 0 ? <option value="">Sem cartões cadastrados</option> : cartoesDisponiveis.map(c => <option key={c.id} value={c.id}>{c.nome_cartao} (Venc. {c.dia_vencimento})</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalFinanceiroAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontWeight: '700' }}>Voltar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontWeight: '700' }}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button className="btn-voltar" onClick={() => setSistemaAtivo('HOME')}>🏠 Voltar ao Hub</button>

      <header className="header-app">
        <h1 style={{ color: '#1e3a8a', margin: 0, fontSize: '32px', fontWeight: '850' }}>Compras 🛒</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px', fontWeight: '500' }}>Catálogo Técnico de Insumos Integrado</p>
      </header>

      <nav className="nav-abas">
        <button onClick={() => setAbaAtual('NOVA')} className={`btn-aba ${abaAtual === 'NOVA' ? 'btn-aba-ativa' : ''}`}>🛒 Carrinho</button>
        <button onClick={() => setAbaAtual('PLANEJAR')} className={`btn-aba ${abaAtual === 'PLANEJAR' ? 'btn-aba-ativa' : ''}`}>📝 Planejar Lista</button>
        <button onClick={() => setAbaAtual('CADASTRO')} className={`btn-aba ${abaAtual === 'CADASTRO' ? 'btn-aba-ativa' : ''}`}>📦 Itens Cadastrados</button>
        <button onClick={() => setAbaAtual('HISTORICO')} className={`btn-aba ${abaAtual === 'HISTORICO' ? 'btn-aba-ativa' : ''}`}>📜 Histórico Notas</button>
      </nav>

      {/* ABA: PLANEJAR LISTA */}
      {abaAtual === 'PLANEJAR' && (
        <div className="grid-layout">
          <section className="card-app">
            <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', color: '#1d4ed8' }}>📝 O que está faltando comprar?</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button type="button" onClick={() => setTipoCompra('CASA')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontWeight: '700', backgroundColor: tipoCompra === 'CASA' ? '#eff6ff' : '#fff', color: tipoCompra === 'CASA' ? '#1d4ed8' : '#4b5563' }}>🏠 Casa</button>
              <button type="button" onClick={() => setTipoCompra('LOJA')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontWeight: '700', backgroundColor: tipoCompra === 'LOJA' ? '#fff7ed' : '#fff', color: tipoCompra === 'LOJA' ? '#ea580c' : '#4b5563' }}>🏪 Loja</button>
            </div>
            
            <form onSubmit={adicionarItemPlanejado} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#4b5563' }}>PRODUTOS CADASTRADOS</label>
                {produtosFiltradosPorDestino.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>⚠️ Cadastre os itens na aba "Itens Cadastrados" primeiro!</p>
                ) : (
                  <select value={prodPlanejadoId} onChange={(e) => setProdPlanejadoId(e.target.value)} className="select-padrao" required>
                    <option value="">-- Escolha do Catálogo --</option>
                    {produtosFiltradosPorDestino.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.marca}) - {p.tamanho_embalagem}{p.unidade_medida.toLowerCase()}</option>)}
                  </select>
                )}
              </div>

              <input type="number" step="0.01" value={qtdPlanejada} onChange={(e) => setQtdPlanejada(e.target.value)} placeholder="Quantidade Necessária" className="input-padrao" required />
              <button type="submit" disabled={produtosFiltradosPorDestino.length === 0} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>... Anotar na Lista de Faltas</button>
            </form>
          </section>

          <section className="card-app">
            <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px' }}>📋 Lista de Faltas Ativa ({tipoCompra})</h3>
            {itensPlanejados.length === 0 ? <p style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Nenhum item pendente. Tudo abastecido!</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {itensPlanejados.map((item) => {
                  let precoTemp = '';
                  return (
                    <div key={item.id_interno} style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>
                          <span style={{ color: '#2563eb' }}>{item.quantidade}x</span> {item.nome}
                        </div>
                        <small style={{ color: '#64748b' }}>Marca: {item.marca} | Valor Base: R$ {item.preco_base?.toFixed(2)}</small>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          step="0.01" 
                          placeholder={`R$ (${item.preco_base?.toFixed(2)})`} 
                          className="input-padrao" 
                          style={{ width: '85px', padding: '6px', fontSize: '12px', margin: 0 }}
                          onChange={(e) => { precoTemp = e.target.value; }}
                        />
                        <button 
                          onClick={() => moverPlanejadoParaCarrinho(item, precoTemp)}
                          style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}
                        >
                          🛒 Pego
                        </button>
                        <button onClick={() => setItensPlanejados(itensPlanejados.filter(p => p.id_interno !== item.id_interno))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ABA: CARRINHO */}
      {abaAtual === 'NOVA' && (
        <div className="grid-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <section className="card-app">
              <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700' }}>1. Destino & Local</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button type="button" onClick={() => { setTipoCompra('CASA'); setProdutoSelecionadoId(''); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid', cursor: 'pointer', fontWeight: '700', backgroundColor: tipoCompra === 'CASA' ? '#eff6ff' : '#fff', color: tipoCompra === 'CASA' ? '#1d4ed8' : '#4b5563', borderColor: tipoCompra === 'CASA' ? '#3b82f6' : '#e5e7eb' }}>🏠 Casa</button>
                <button type="button" onClick={() => { setTipoCompra('LOJA'); setProdutoSelecionadoId(''); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid', cursor: 'pointer', fontWeight: '700', backgroundColor: tipoCompra === 'LOJA' ? '#fff7ed' : '#fff', color: tipoCompra === 'LOJA' ? '#ea580c' : '#4b5563', borderColor: tipoCompra === 'LOJA' ? '#ea580c' : '#e5e7eb' }}>🏪 Loja</button>
              </div>
              <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Supermercado BH, Atacadão" className="input-padrao" required />
            </section>

            <section className="card-app">
              <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700' }}>2. Detalhes da Compra</h3>

              <form onSubmit={adicionarItemNaLista} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#4b5563' }}>PRODUTOS CADASTRADOS</label>
                  {produtosFiltradosPorDestino.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>⚠️ Cadastre os itens na aba "Itens Cadastrados" primeiro!</p>
                  ) : (
                    <select value={produtoSelecionadoId} onChange={(e) => setProdutoSelecionadoId(e.target.value)} className="select-padrao" required>
                      <option value="">-- Selecione o Item --</option>
                      {produtosFiltradosPorDestino.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.marca}) - {p.tamanho_embalagem}{p.unidade_medida.toLowerCase()}</option>)}
                    </select>
                  )}
                </div>

                {produtoAtualEmUso && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '6px', fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>
                    🏷️ Preço cadastrado: R$ {produtoAtualEmUso.preco_base?.toFixed(2)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="number" step="0.001" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Qtd" className="input-padrao" style={{ width: '35%' }} required />
                  <input type="number" step="0.01" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} placeholder={produtoAtualEmUso ? `R$ (${produtoAtualEmUso.preco_base?.toFixed(2)})` : "R$ Valor Real Pago"} className="input-padrao" style={{ width: '65%' }} />
                </div>
                
                <button type="submit" disabled={produtosFiltradosPorDestino.length === 0} style={{ width: '100%', backgroundColor: '#1e3a8a', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
                  ＋ Adicionar ao Carrinho
                </button>
              </form>
            </section>
          </div>

          <div>
            {itens.length > 0 ? (
              <section className="card-app">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Carrinho de Compras</h3>
                  <span style={{ fontWeight: '800', fontSize: '22px', color: '#16a34a' }}>R$ {calcularTotalGeral()}</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                  {itens.map((item) => (
                    <div key={item.id_interno} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <span>
                        <strong style={{color: '#1e3a8a'}}>
                          {item.quantidade}x
                        </strong> {item.produto}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: '600' }}>R$ {(item.quantidade * item.valor_unitario).toFixed(2)}</span>
                        <button onClick={() => removerItemDoCarrinho(item.id_interno)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '14px' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleIniciarFechamento} style={{ width: '100%', backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '16px' }}>
                  💾 Finalizar e Escolher Pagador
                </button>
              </section>
            ) : (
              <div className="card-app" style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <span style={{ fontSize: '32px' }}>🛒</span>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: '500' }}>Seu carrinho está vazio.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: LISTA DE ITENS CADASTRADOS */}
      {abaAtual === 'CADASTRO' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <section className="card-app">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e3a8a' }}>Catálogo de Itens Cadastrados ({bancoProdutos.length})</h3>
              <button 
                onClick={() => { cancelarEdicao(); setModalCadastroAberto(true); }} 
                style={{ backgroundColor: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
              >
                ＋ Cadastrar Novo
              </button>
            </div>

            {bancoProdutos.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontSize: '14px' }}>Nenhum item fixo catalogado ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
                {bancoProdutos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#1f2937' }}>{p.nome}</span> <small style={{color: '#6b7280'}}>({p.marca})</small>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>Destino: {p.destino_padrao} | Categoria: {p.categoria}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <small style={{ color: '#7c3aed', fontWeight: '800', marginRight: '8px', fontSize: '12px' }}>
                        {p.tamanho_embalagem}{p.unidade_medida.toLowerCase()} • R$ {p.preco_base?.toFixed(2)}
                      </small>
                      <button onClick={() => iniciarEdicaoInsumo(p)} title="Alterar Item" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '6px' }}>✏️</button>
                      <button onClick={() => deletarInsumoDoBanco(p.id, p.nome)} title="Excluir Permanentemente" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '6px' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* TELINHA FLUTUANTE (MODAL INTERNO) PARA CADASTRO / EDIÇÃO */}
          {modalCadastroAberto && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
              <div className="card-app" style={{ width: '100%', maxWidth: '460px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: modoEdicaoId ? '#ea580c' : '#1e3a8a' }}>
                    {modoEdicaoId ? '✏️ Alterar Detalhes do Item' : '📦 Adicionar Item ao Catálogo'}
                  </h3>
                  <button onClick={cancelarEdicao} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', fontWeight: '700', color: '#9ca3af' }}>✕</button>
                </div>

                <form onSubmit={handleCadastrarItemFixo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#4b5563' }}>NOME DO COMPONENTE / ITEM</label>
                    <input type="text" value={novoItemNome} onChange={(e) => setNovoItemNome(e.target.value)} placeholder="Ex: Leite Condensado, Creme de Leite" className="input-padrao" required />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#4b5563' }}>MARCA / FABRICANTE</label>
                    <input type="text" value={novoItemMarca} onChange={(e) => setNovoItemMarca(e.target.value)} placeholder="Ex: Moça, Itambé, Nestlé" className="input-padrao" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#4b5563' }}>UNIDADE DE MEDIDA DE COMPRA</label>
                      <select value={novoItemUnidade} onChange={(e) => setNovoItemUnidade(e.target.value)} className="select-padrao">
                        <option value="G">g (Gramas)</option>
                        <option value="KG">kg (Quilos)</option>
                        <option value="ML">ml (Mililitros)</option>
                        <option value="L">L (Litros)</option>
                        <option value="UN">un (Unidade/Caixa/Lata)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#4b5563' }}>VALOR UNITÁRIO (R$)</label>
                      <input type="number" step="0.01" value={novoItemPreco} onChange={(e) => setNovoItemPreco(e.target.value)} placeholder="Custo Estimado" className="input-padrao" required />
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '800', color: '#7c3aed' }}>
                      {novoItemUnidade === 'UN' 
                        ? '⚖️ PESO LÍQUIDO DA UNIDADE (Gramas ou ML por caixa/lata)' 
                        : '⚖️ CONTEÚDO DA EMBALAGEM'}
                    </label>
                    <input 
                      type="number" 
                      step="0.001" 
                      value={novoItemTamanho} 
                      onChange={(e) => setNovoItemTamanho(e.target.value)} 
                      placeholder={novoItemUnidade === 'UN' ? "Ex: Se for caixa de leite condensado, coloque 395" : "Ex: 200, 500, 1"} 
                      className="input-padrao" 
                      style={{ borderColor: '#a78bfa' }} 
                      required 
                    />
                    <small style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {novoItemUnidade === 'UN' 
                        ? '💡 Fundamental para a Confeitaria: digite o peso em gramas/ml para o sistema somar o Peso Cru da receita automaticamente quando você usar 1 unidade.' 
                        : 'Indique a cubagem ou peso da embalagem fechada do item.'}
                    </small>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#4b5563' }}>DESTINO DO INSUMO</label>
                    <select value={novoItemDestino} onChange={(e) => setNovoItemDestino(e.target.value)} className="select-padrao">
                      <option value="CASA">🏠 Uso em Casa</option>
                      <option value="LOJA">🏪 Insumo da Loja (Mimos Doces)</option>
                      <option value="AMBOS">🔄 Ambos (Casa e Loja)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#4b5563' }}>CATEGORIA</label>
                    <select value={novoItemCategoria} onChange={(e) => setNovoItemCategoria(e.target.value)} className="select-padrao">
                      <option value="Alimentos">Alimentos</option>
                      <option value="Insumos/Embalagens">Insumos / Embalagens</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Higiene">Higiene</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button type="button" onClick={cancelarEdicao} style={{ width: '35%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontWeight: '700', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={cadastrandoFixo} style={{ flex: 1, backgroundColor: modoEdicaoId ? '#ea580c' : '#1e3a8a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                      {cadastrandoFixo ? 'Salvando...' : modoEdicaoId ? '🔒 Salvar Alteração' : '🔒 Adicionar Item'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA: HISTÓRICO */}
      {abaAtual === 'HISTORICO' && (
        <div className="grid-layout">
          <div className={compraSelecionada ? '' : 'col-inteira'}>
            <section className="card-app">
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '700', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Histórico Geral de Listas</h3>
              {carregandoHistorial ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>Buscando notas...</p>
              ) : listaCompras.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhuma nota fiscal registrada.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {listaCompras.map((compra) => (
                    <div key={compra.id} onClick={() => visualizarDetalhesCompra(compra)} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: compraSelecionada?.id === compra.id ? '#eff6ff' : '#f9fafb', borderColor: compraSelecionada?.id === compra.id ? '#3b82f6' : '#e5e7eb' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{compra.local_compra}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: compra.tipo_compra === 'CASA' ? '#dbeafe' : '#ffedd5', color: compra.tipo_compra === 'CASA' ? '#1e40af' : '#ea580c' }}>{compra.tipo_compra}</span>
                          <small style={{ color: '#6b7280' }}>{new Date(compra.data_compra).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: '800', color: '#16a34a' }}>R$ {compra.valor_total.toFixed(2)}</span>
                        <button onClick={(e) => deletarCompra(e, compra.id)} style={{ backgroundColor: '#fee2e2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {compraSelecionada && (
            <div className="card-app">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e3a8a' }}>{compraSelecionada.local_compra}</h2>
                  <small style={{ color: '#6b7280', fontWeight: '500' }}>
                    Nota de {compraSelecionada.tipo_compra} • Compra realizada em {new Date(compraSelecionada.data_compra).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </small>
                </div>
                <button onClick={() => setCompraSelecionada(null)} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Fechar</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                {itensDaCompraSelecionada.map((item) => (
                  <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px dashed #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{item.produto}</div>
                      <small style={{ color: '#9ca3af', fontWeight: '500' }}>
                        {item.quantidade}x comprado por <strong style={{color: '#4b5563'}}>R$ {parseFloat(item.valor_unitario || 0).toFixed(2)}</strong> cada
                      </small>
                    </div>
                    <span style={{ fontWeight: '700', alignSelf: 'center', color: '#1e3a8a' }}>
                      R$ {(item.quantidade * (item.valor_unitario || 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '8px', fontWeight: '800', color: '#16a34a', fontSize: '16px' }}>
                <span>Valor Total Pago:</span>
                <span>R$ {compraSelecionada.valor_total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}