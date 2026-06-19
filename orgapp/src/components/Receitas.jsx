import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Receitas({ setSistemaAtivo, mostrarNotificacao }) {
  const [abaAtual, setAbaAtual] = useState('LISTA'); 

  // Estados para nova receita / edição
  const [modoEdicaoId, setModoEdicaoId] = useState(null);
  const [nomeReceita, setNomeReceita] = useState('');
  const [pesoFinalReal, setPesoFinalReal] = useState(''); 
  const [ingredientesEscolhidos, setIngredientesInternos] = useState([]);
  const [salvando, setSalvando] = useState(false);

  // Seletores de ingredientes no formulário
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [qtdUsada, setQtdUsada] = useState('');

  // Estados de dados do banco
  const [bancoProdutos, setBancoProdutos] = useState([]);
  const [listaReceitas, setListaReceitas] = useState([]);
  const [receitaExpandida, setReceitaExpandida] = useState(null);
  const [detalhesIngredientes, setDetalhesIngredientes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const buscarDadosIniciais = async () => {
    setCarregando(true);
    const { data: prods } = await supabase.from('produtos_cadastrados').select('*').order('nome', { ascending: true });
    if (prods) {
      setBancoProdutos(prods);
      const filtradosLoja = prods.filter(p => p.destino_padrao === 'LOJA' || p.destino_padrao === 'AMBOS');
      if (filtradosLoja.length > 0) setProdutoSelecionadoId(filtradosLoja[0].id.toString());
    }

    const { data: recs } = await supabase.from('receitas').select('*').order('nome', { ascending: true });
    if (recs) setListaReceitas(recs);
    setCarregando(false);
  };

  useEffect(() => {
    buscarDadosIniciais();
  }, [abaAtual]);

  const adicionarIngredienteNaFicha = (e) => {
    e.preventDefault();
    if (!produtoSelecionadoId || !qtdUsada) return;

    const prod = bancoProdutos.find(p => p.id === parseInt(produtoSelecionadoId));
    if (!prod) return;

    const jaExiste = ingredientesEscolhidos.some(item => item.produto_id === prod.id);
    if (jaExiste) {
      mostrarNotificacao('Este ingrediente já foi adicionado!', 'erro');
      return;
    }

    let pesoEmGramas = parseFloat(qtdUsada);
    
    if (prod.unidade_medida.toUpperCase() === 'UN') {
      pesoEmGramas = parseFloat(qtdUsada) * (parseFloat(prod.tamanho_embalagem) || 1);
    } else if (prod.unidade_medida.toUpperCase() === 'KG' || prod.unidade_medida.toUpperCase() === 'L') {
      pesoEmGramas = parseFloat(qtdUsada) * 1000;
    }

    setIngredientesInternos([...ingredientesEscolhidos, {
      id_interno: Date.now() + Math.random(),
      produto_id: prod.id,
      nome: prod.nome,
      marca: prod.marca,
      quantidade_usada: parseFloat(qtdUsada),
      peso_calculado_gramas: pesoEmGramas, 
      unidade_medida: prod.unidade_medida,
      tamanho_embalagem: prod.tamanho_embalagem,
      preco_base: prod.preco_base || 0
    }]);

    setQtdUsada('');
    mostrarNotificacao('Ingrediente adicionado!');
  };

  const removerIngredienteDaFichaTemporaria = (idInterno) => {
    setIngredientesInternos(ingredientesEscolhidos.filter(item => item.id_interno !== idInterno));
    mostrarNotificacao('Ingrediente removido.');
  };

  const calcularCustoProporcional = (item) => {
    if (!item.preco_base) return 0;

    if (item.unidade_medida?.toUpperCase() === 'UN') {
      return item.quantidade_usada * item.preco_base;
    }

    if (item.tamanho_embalagem > 0) {
      const divisor = item.unidade_medida?.toUpperCase() === 'KG' || item.unidade_medida?.toUpperCase() === 'L' ? 1000 : 1;
      const pacotesNecessarios = Math.ceil(item.peso_calculado_gramas / (item.tamanho_embalagem * divisor));
      return pacotesNecessarios * item.preco_base;
    }

    return (item.quantidade_usada / (item.tamanho_embalagem || 1)) * item.preco_base;
  };

  const calcularCustoTotalNovaReceita = () => {
    return ingredientesEscolhidos.reduce((acc, item) => acc + calcularCustoProporcional(item), 0);
  };

  const calcularPesoCruTotalNovaReceita = () => {
    return ingredientesEscolhidos.reduce((acc, item) => acc + item.peso_calculado_gramas, 0);
  };

  const iniciarEdicaoReceita = async (e, receita) => {
    e.stopPropagation();
    setModoEdicaoId(receita.id);
    setNomeReceita(receita.nome);
    setPesoFinalReal(receita.peso_final_real_gramas?.toString() || '');
    setReceitaExpandida(null);

    const { data } = await supabase
      .from('ingredientes_receita')
      .select('quantidade_usada, produtos_cadastrados(*)')
      .eq('receita_id', receita.id);

    if (data) {
      const formatados = data.map(item => {
        const p = item.produtos_cadastrados;
        let pesoG = item.quantidade_usada;
        if (p.unidade_medida.toUpperCase() === 'UN') {
          pesoG = item.quantidade_usada * (parseFloat(p.tamanho_embalagem) || 1);
        } else if (p.unidade_medida.toUpperCase() === 'KG' || p.unidade_medida.toUpperCase() === 'L') {
          pesoG = item.quantidade_usada * 1000;
        }
        return {
          id_interno: Date.now() + Math.random(),
          produto_id: p.id,
          nome: p.nome,
          marca: p.marca,
          quantidade_usada: item.quantidade_usada,
          peso_calculado_gramas: pesoG,
          tamanho_embalagem: p.tamanho_embalagem,
          unidade_medida: p.unidade_medida,
          preco_base: p.preco_base || 0
        };
      });
      setIngredientesInternos(formatados);
    }
    setAbaAtual('NOVA');
  };

  const cancelarEdicao = () => {
    setModoEdicaoId(null);
    setNomeReceita('');
    setPesoFinalReal('');
    setIngredientesInternos([]);
    setAbaAtual('LISTA');
  };

  const handleSalvarReceita = async (e) => {
    e.preventDefault();
    if (!nomeReceita || ingredientesEscolhidos.length === 0 || !pesoFinalReal) {
      mostrarNotificacao('Preencha o nome, ingredientes e o peso final real após o preparo!', 'erro');
      return;
    }

    setSalvando(true);
    const pesoProntoReal = parseFloat(pesoFinalReal);

    if (modoEdicaoId) {
      const { error: errRec } = await supabase
        .from('receitas')
        .update({ 
          nome: nomeReceita, 
          rendimento_unidades: 1, 
          peso_porcao_gramas: pesoProntoReal,
          peso_final_real_gramas: pesoProntoReal
        })
        .eq('id', modoEdicaoId);

      if (errRec) {
        mostrarNotificacao('Erro ao atualizar banco: ' + errRec.message, 'erro');
        setSalvando(false);
        return;
      }

      await supabase.from('ingredientes_receita').delete().eq('receita_id', modoEdicaoId);

      const ingredientesPayload = ingredientesEscolhidos.map(item => ({
        receita_id: modoEdicaoId,
        produto_id: item.produto_id,
        quantidade_usada: item.quantidade_usada
      }));

      await supabase.from('ingredientes_receita').insert(ingredientesPayload);
      mostrarNotificacao(`Ficha de ${nomeReceita} atualizada com sucesso!`);
      cancelarEdicao();
    } else {
      const { data: novaRec, error: errRec } = await supabase
        .from('receitas')
        .insert([{ 
          nome: nomeReceita, 
          rendimento_unidades: 1, 
          peso_porcao_gramas: pesoProntoReal,
          peso_final_real_gramas: pesoProntoReal
        }])
        .select();

      if (errRec) {
        mostrarNotificacao('Erro ao salvar no banco: ' + errRec.message, 'erro');
        setSalvando(false);
        return;
      }

      const receitaId = novaRec[0].id;
      const ingredientesPayload = ingredientesEscolhidos.map(item => ({
        receita_id: receitaId,
        produto_id: item.produto_id,
        quantidade_usada: item.quantidade_usada
      }));

      await supabase.from('ingredientes_receita').insert(ingredientesPayload);
      mostrarNotificacao(`Ficha de ${nomeReceita} salva com sucesso!`);
      setNomeReceita('');
      setPesoFinalReal('');
      setIngredientesInternos([]);
      setAbaAtual('LISTA');
    }
    setSalvando(false);
  };

  const expandirDetalhesReceita = async (receita) => {
    if (modoEdicaoId) return; 
    setReceitaExpandida(receita);
    const { data } = await supabase
      .from('ingredientes_receita')
      .select('quantidade_usada, produtos_cadastrados(*)')
      .eq('receita_id', receita.id);

    if (data) {
      const formatados = data.map(item => {
        const p = item.produtos_cadastrados;
        let pesoG = item.quantidade_usada;
        if (p.unidade_medida.toUpperCase() === 'UN') {
          pesoG = item.quantidade_usada * (parseFloat(p.tamanho_embalagem) || 1);
        } else if (p.unidade_medida.toUpperCase() === 'KG' || p.unidade_medida.toUpperCase() === 'L') {
          pesoG = item.quantidade_usada * 1000;
        }
        return {
          nome: p.nome,
          marca: p.marca,
          quantidade_usada: item.quantidade_usada,
          peso_calculado_gramas: pesoG,
          tamanho_embalagem: p.tamanho_embalagem,
          unidade_medida: p.unidade_medida,
          preco_base: p.preco_base || 0
        };
      });
      setDetalhesIngredientes(formatados);
    }
  };

  const prodsFiltradosLoja = bancoProdutos.filter(p => p.destino_padrao === 'LOJA' || p.destino_padrao === 'AMBOS');
  
  const custoNova = calcularCustoTotalNovaReceita();
  const pesoCruNova = calcularPesoCruTotalNovaReceita();
  const pesoRealNovaNum = parseFloat(pesoFinalReal) || 0;
  
  const reducaoPercentualNova = pesoCruNova > 0 && pesoRealNovaNum > 0 
    ? ((pesoCruNova - pesoRealNovaNum) / pesoCruNova) * 100 
    : 0;

  const custoGramaNova = pesoRealNovaNum > 0 ? (custoNova / pesoRealNovaNum) : 0;

  return (
    <div>
      <button className="btn-voltar" onClick={() => setSistemaAtivo('HOME')}>Hub</button>

      <header className="header-app">
        <h1 style={{ color: '#7c3aed', margin: 0, fontSize: '32px', fontWeight: '850' }}>Ficha Técnica de Doces 🍰</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px', fontWeight: '500' }}>Cálculo real de quebra por evaporação e valor por grama</p>
      </header>

      <nav className="nav-abas">
        <button onClick={() => { if(modoEdicaoId) cancelarEdicao(); else setAbaAtual('LISTA'); }} className={`btn-aba ${abaAtual === 'LISTA' ? 'btn-aba-ativa' : ''}`}>📋 Minhas Receitas</button>
        <button onClick={() => setAbaAtual('NOVA')} className={`btn-aba ${abaAtual === 'NOVA' ? 'btn-aba-ativa' : ''}`}>{modoEdicaoId ? '✏️ Editando Receita' : '＋ Nova Receita'}</button>
      </nav>

      {abaAtual === 'NOVA' && (
        <div className="grid-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <section className="card-app">
              <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700', color: modoEdicaoId ? '#ea580c' : '#1f2937' }}>
                {modoEdicaoId ? '✏️ 1. Alterar Informações Técnicas' : '1. Informações Técnicas da Massa'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" value={nomeReceita} onChange={(e) => setNomeReceita(e.target.value)} placeholder="Nome do Doce (ex: Brigadeiro Tradicional)" className="input-padrao" required />
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#ea580c' }}>PESO PÓS-FOGO REAL (g)</label>
                  {/* CORREÇÃO SINTÁTICA DA DUPLA ARROW EFETUADA COM SUCESSO AQUI */}
                  <input type="number" value={pesoFinalReal} onChange={(e) => setPesoFinalReal(e.target.value)} placeholder="Peso final obtido na balança" className="input-padrao" required />
                </div>
              </div>
            </section>

            <section className="card-app">
              <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700', color: '#7c3aed' }}>2. Adicionar Ingredientes Crus</h3>
              <form onSubmit={adicionarIngredienteNaFicha} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select value={produtoSelecionadoId} onChange={(e) => setProdutoSelecionadoId(e.target.value)} className="select-padrao" required>
                  {prodsFiltradosLoja.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.marca}) - {p.tamanho_embalagem}{p.unidade_medida.toLowerCase() === 'un' ? 'g por un' : p.unidade_medida.toLowerCase()}
                    </option>
                  ))}
                </select>
                <input type="number" step="0.001" value={qtdUsada} onChange={(e) => setQtdUsada(e.target.value)} placeholder="Quantidade usada (ex: se usar 1 caixa inteira, digite 1)" className="input-padrao" required />
                <button type="submit" style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Incluir na Receita</button>
              </form>
            </section>
          </div>

          <div>
            {ingredientesEscolhidos.length > 0 ? (
              <section className="card-app">
                <h3 style={{ marginTop: 0, borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Indicadores de Perda e Redução</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0', maxHeight: '180px', overflowY: 'auto' }}>
                  {ingredientesEscolhidos.map((item) => (
                    <div key={item.id_interno} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '14px', alignItems: 'center' }}>
                      <span><strong>{item.nome}</strong> <small style={{color: '#6b7280'}}>({item.quantidade_usada}{item.unidade_medida.toLowerCase()})</small></span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '600' }}>R$ {calcularCustoProporcional(item).toFixed(2)}</span>
                        <button onClick={() => removerIngredienteDaFichaTemporaria(item.id_interno)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '12px', backgroundColor: '#f5f3ff', borderRadius: '8px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}>
                    <span>⚖️ Peso Esperado Teoricamente (Cru):</span>
                    <span style={{ fontWeight: '600' }}>{pesoCruNova.toFixed(0)}g</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}>
                    <span>🍳 Peso Real Obtido (Pronto):</span>
                    <span style={{ fontWeight: '600', color: '#ea580c' }}>{pesoRealNovaNum.toFixed(0)}g</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#dc2626', fontWeight: '700', backgroundColor: '#fef2f2', padding: '6px', borderRadius: '4px', margin: '2px 0' }}>
                    <span>📉 Perda por Redução (Evaporação):</span>
                    <span>{reducaoPercentualNova > 0 ? `- ${reducaoPercentualNova.toFixed(1)}%` : '0%'}</span>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #ddd', margin: '4px 0' }}></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#6d28d9', fontSize: '15px' }}>
                    <span>💲 VALOR DA GRAMA PRONTA:</span>
                    <span>R$ {custoGramaNova.toFixed(4)} /g</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {modoEdicaoId && (
                    <button type="button" onClick={cancelarEdicao} style={{ width: '35%', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={handleSalvarReceita} disabled={salvando} style={{ flex: 1, backgroundColor: modoEdicaoId ? '#ea580c' : '#10b981', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
                    {salvando ? 'Salvando...' : modoEdicaoId ? '🔒 Salvar Alterações' : '🔒 Concluir e Salvar Ficha'}
                  </button>
                </div>
              </section>
            ) : (
              <div className="card-app" style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>Insira os ingredientes para gerar a análise técnica de diluição e custos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtual === 'LISTA' && (
        <div className="grid-layout">
          <div className={receitaExpandida ? '' : 'col-inteira'}>
            <section className="card-app">
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>Doces no Catálogo</h3>
              {carregando ? (
                <p style={{ textAlign: 'center', color: '#6b7280' }}>Buscando fichas...</p>
              ) : listaReceitas.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhuma receita criada ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {listaReceitas.map((rec) => (
                    <div key={rec.id} onClick={() => expandirDetalhesReceita(rec)} style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: receitaExpandida?.id === rec.id ? '#f5f3ff' : '#f9fafb', borderColor: receitaExpandida?.id === rec.id ? '#a78bfa' : '#e5e7eb' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px', color: '#1f2937' }}>{rec.nome}</div>
                        <small style={{ color: '#6b7280', fontWeight: '500' }}>Massa pronta final: {rec.peso_final_real_gramas ? rec.peso_final_real_gramas.toFixed(0) : 0}g</small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button onClick={(e) => iniciarEdicaoReceita(e, rec)} title="Editar Ficha" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '6px' }}>✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Excluir receita?')) supabase.from('receitas').delete().eq('id', rec.id).then(() => buscarDadosIniciais()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '6px' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {receitaExpandida && (
            <div className="card-app">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#7c3aed' }}>{receitaExpandida.nome}</h2>
                  <small style={{ color: '#6b7280', fontWeight: '600' }}>Massa pesada pós-fogo com: {receitaExpandida.peso_final_real_gramas ? receitaExpandida.peso_final_real_gramas.toFixed(0) : 0}g</small>
                </div>
                <button onClick={() => setReceitaExpandida(null)} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Fechar</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {detalhesIngredientes.map((ing, index) => (
                  <div key={index} style={{ padding: '8px 0', borderBottom: '1px dashed #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>{ing.nome} <small style={{color: '#9ca3af'}}>({ing.marca})</small></div>
                      <small style={{ color: '#6b7280' }}>Usa {ing.quantidade_usada}{ing.unidade_medida.toLowerCase()} • Custo Mercado: R$ {ing.preco_base.toFixed(2)}</small>
                    </div>
                    <span style={{ fontWeight: '700', alignSelf: 'center', color: '#4b5563' }}>R$ {calcularCustoProporcional(ing).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const totalCustoSalvo = detalhesIngredientes.reduce((acc, item) => acc + calcularCustoProporcional(item), 0);
                const totalPesoCruSalvo = detalhesIngredientes.reduce((acc, item) => acc + item.peso_calculado_gramas, 0);
                const pesoProntoSalvo = receitaExpandida.peso_final_real_gramas || 1;
                
                const valorDaGramaSalva = totalCustoSalvo / pesoProntoSalvo;
                const reducaoSalva = ((totalPesoCruSalvo - pesoProntoSalvo) / totalPesoCruSalvo) * 100;

                return (
                  <div style={{ padding: '14px', backgroundColor: '#f5f3ff', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}>
                      <span>⚖️ Peso bruto original (Cru):</span>
                      <span>{totalPesoCruSalvo.toFixed(0)}g</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
                      <span>📉 Redução térmica sofrida:</span>
                      <span>-{reducaoSalva.toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}>
                      <span>💰 Gasto Total Matéria-Prima:</span>
                      <span>R$ {totalCustoSalvo.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px dashed #ccc', margin: '4px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '850', color: '#6d28d9', fontSize: '15px' }}>
                      <span>📉 CUSTO DA GRAMA ATUAL:</span>
                      <span>R$ {valorDaGramaSalva.toFixed(4)} /g</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}