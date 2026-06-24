import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Delivery({ setSistemaAtivo, mostrarNotificacao }) {
  // ABA PRINCIPAL ATIVA
  const [moduloAtivo, setModuloAtivo] = useState('BASES'); 

  // ==========================================
  // ESTADOS GERAIS DO BANCO
  // ==========================================
  const [bancoProdutos, setBancoProdutos] = useState([]);
  const [listaReceitas, setListaReceitas] = useState([]);
  const [ingredientesGlobais, setIngredientesGlobais] = useState([]); 
  const [listaEmbalagens, setListaEmbalagens] = useState([]); 
  const [listaMontagens, setListaMontagens] = useState([]);
  const [custosGlobais, setCustosGlobais] = useState({ faturamento_meta: 15000, horas_mes: 220 });
  const [itensCusto, setItensCusto] = useState([]);
  const [carregando, setCarregando] = useState(false);

  // MODAL UNIVERSAL DE EXCLUSÃO
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, tipo: '', item: null });

  // ==========================================
  // ESTADOS DA ABA 1: BASES
  // ==========================================
  const [abaBases, setAbaBases] = useState('LISTA');
  const [edicaoBaseId, setEdicaoBaseId] = useState(null);
  const [baseNome, setBaseNome] = useState('');
  const [basePesoPronto, setBasePesoPronto] = useState('');
  const [baseTempoPreparo, setBaseTempoPreparo] = useState(''); // <--- NOVO
  const [baseIngredientes, setBaseIngredientes] = useState([]);
  const [baseInsumoSelecionadoId, setBaseInsumoSelecionadoId] = useState('');
  const [baseQtdUsada, setBaseQtdUsada] = useState('');
  const [baseExpandida, setBaseExpandida] = useState(null);
  const [baseDetalhesExpandidos, setBaseDetalhesExpandidos] = useState([]);
  const [salvandoBase, setSalvandoBase] = useState(false);

  // ==========================================
  // ESTADOS DA ABA 2: EMBALAGENS
  // ==========================================
  const [modalEmbAberto, setModalEmbAberto] = useState(false);
  const [edicaoEmbId, setEdicaoEmbId] = useState(null);
  const [embNome, setEmbNome] = useState('');
  const [embMarca, setEmbMarca] = useState('');
  const [embQtd, setEmbQtd] = useState('');
  const [embValor, setEmbValor] = useState('');
  const [salvandoEmb, setSalvandoEmb] = useState(false);

  // ==========================================
  // ESTADOS DA ABA 3: MONTAGEM FINAL
  // ==========================================
  const [abaMontagem, setAbaMontagem] = useState('LISTA');
  const [edicaoMontId, setEdicaoMontId] = useState(null); 
  const [montNome, setMontNome] = useState('');
  const [montTempoMontagem, setMontTempoMontagem] = useState(''); // <--- NOVO
  const [montItensTemp, setMontItensTemp] = useState([]);
  const [montTipoPeca, setMontTipoPeca] = useState('BASE');
  const [montPecaId, setMontPecaId] = useState('');
  const [montQtdPeca, setMontQtdPeca] = useState('');
  const [montExpandida, setMontExpandida] = useState(null);
  const [montDetalhesExpandidos, setMontDetalhesExpandidos] = useState([]);
  const [salvandoMontagem, setSalvandoMontagem] = useState(false);

  // ==========================================
  // ESTADOS DA ABA 4: SIMULADOR DE CARDÁPIO
  // ==========================================
  const [simuladorProdutoId, setSimuladorProdutoId] = useState('');
  const [simuladorLucroPerc, setSimuladorLucroPerc] = useState('20');
  const [lucrosSimulador, setLucrosSimulador] = useState({});
  const [precosSimulador, setPrecosSimulador] = useState({}); 

  // ==========================================
  // ESTADOS DA ABA 5: CUSTOS E TAXAS
  // ==========================================
  const [modalCustoAberto, setModalCustoAberto] = useState(false);
  const [edicaoCustoId, setEdicaoCustoId] = useState(null);
  const [formCusto, setFormCusto] = useState({ nome: '', valor: '', categoria: 'Despesas Administrativas', is_percentual: false, novaCategoria: '' });
  const [salvandoCusto, setSalvandoCusto] = useState(false);

  const prodsFiltradosLoja = bancoProdutos.filter(p => p.destino_padrao === 'LOJA' || p.destino_padrao === 'AMBOS');

  // Sincronizadores automáticos de menus de seleção
  useEffect(() => {
    if (prodsFiltradosLoja.length > 0 && !baseInsumoSelecionadoId) {
      setBaseInsumoSelecionadoId(prodsFiltradosLoja[0].id.toString());
    }
  }, [bancoProdutos, baseInsumoSelecionadoId]);

  useEffect(() => {
    if (listaMontagens.length > 0 && !simuladorProdutoId) {
      setSimuladorProdutoId(listaMontagens[0].id.toString());
    }
  }, [listaMontagens, simuladorProdutoId]);

  // Sincroniza o ID do componente ao mudar o Tipo de Peça na aba de Montagem
  useEffect(() => {
    if (montTipoPeca === 'BASE' && listaReceitas.length > 0) {
      setMontPecaId(listaReceitas[0].id.toString());
    } else if (montTipoPeca === 'EMBALAGEM' && listaEmbalagens.length > 0) {
      setMontPecaId(listaEmbalagens[0].id.toString());
    } else if (montTipoPeca === 'INSUMO' && bancoProdutos.length > 0) {
      setMontPecaId(bancoProdutos[0].id.toString());
    } else {
      setMontPecaId('');
    }
  }, [montTipoPeca, listaReceitas, listaEmbalagens, bancoProdutos]);

  const buscarDadosIniciais = async () => {
    setCarregando(true);
    try {
      const { data: prods } = await supabase.from('produtos_cadastrados').select('*').order('nome', { ascending: true });
      if (prods) setBancoProdutos(prods);

      const { data: recs } = await supabase.from('receitas').select('*').order('nome', { ascending: true });
      const { data: ings } = await supabase.from('ingredientes_receita').select('*, produtos_cadastrados(*)');
      if (recs) setListaReceitas(recs);
      if (ings) setIngredientesGlobais(ings);

      const { data: embs } = await supabase.from('embalagens').select('*').order('nome', { ascending: true });
      const { data: monts } = await supabase.from('cardapio_montagens').select('*').order('nome', { ascending: true });
      if (embs) setListaEmbalagens(embs);
      if (monts) setListaMontagens(monts);

      const { data: globais } = await supabase.from('delivery_custos_globais').select('*').eq('id', 1).maybeSingle();
      if (globais) setCustosGlobais(globais);

      const { data: cItens } = await supabase.from('delivery_custos_itens').select('*').order('nome', { ascending: true });
      if (cItens) {
        const possuiCanais = cItens.some(i => i.categoria === 'Canais de Venda (Plataformas)');
        if (!possuiCanais) {
          const canaisPadrao = [
            { categoria: 'Canais de Venda (Plataformas)', nome: 'Cardápio Próprio (WhatsApp/Insta)', valor: 3.5, is_percentual: true },
            { categoria: 'Canais de Venda (Plataformas)', nome: 'iFood (Plano Entrega)', valor: 25.0, is_percentual: true },
            { categoria: 'Canais de Venda (Plataformas)', nome: '99Food', valor: 18.0, is_percentual: true }
          ];
          await supabase.from('delivery_custos_itens').insert(canaisPadrao);
          const { data: atualizados } = await supabase.from('delivery_custos_itens').select('*').order('nome', { ascending: true });
          setItensCusto(atualizados || []);
        } else {
          setItensCusto(cItens);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { buscarDadosIniciais(); }, [moduloAtivo]);

  // ==========================================
  // MOTORES MATEMÁTICOS DE PRECIFICAÇÃO PROPORCIONAL EXATA
  // ==========================================
  const calcularCustoProporcional = (item) => {
    if (!item || !item.preco_base) return 0;
    const precoPacote = parseFloat(item.preco_base) || 0;
    const qtdUsada = parseFloat(item.quantidade_usada) || 0;
    let tamanhoEmbalagem = parseFloat(item.tamanho_embalagem) || 1;
    const unidade = (item.unidade_medida || '').toUpperCase().trim();

    if (unidade === 'KG' || unidade === 'L' || unidade === 'LITRO') {
      tamanhoEmbalagem = tamanhoEmbalagem * 1000;
    }

    const precoUnitario = precoPacote / tamanhoEmbalagem;
    return qtdUsada * precoUnitario;
  };

  const callbackCustoItem = (item) => calcularCustoProporcional(item);

  // Calcula o custo do tempo baseado nas despesas fixas
  const despesasFixasReais = itensCusto.filter(i => !i.is_percentual && i.categoria !== 'Canais de Venda (Plataformas)');
  const totalCustosMensaisFixos = despesasFixasReais.reduce((acc, i) => acc + parseFloat(i.valor), 0);
  
  const calcularCustoTempoMinutos = (minutos) => {
    const min = parseFloat(minutos) || 0;
    const valorHora = custosGlobais.horas_mes > 0 ? (totalCustosMensaisFixos / custosGlobais.horas_mes) : 0;
    return (valorHora / 60) * min;
  };

  const obterCustoGramaBase = (baseId) => {
    const base = listaReceitas.find(r => r.id === parseInt(baseId));
    if (!base || !base.peso_final_real_gramas) return 0;
    const meusIngs = ingredientesGlobais.filter(i => i.receita_id === base.id);
    let custoTotal = 0;
    meusIngs.forEach(it => {
      const p = it.produtos_cadastrados;
      custoTotal += calcularCustoProporcional({
        preco_base: p.preco_base,
        tamanho_embalagem: p.tamanho_embalagem,
        unidade_medida: p.unidade_medida,
        quantidade_usada: it.quantidade_usada
      });
    });
    
    // O custo final da grama da base soma o custo de preparo se existir
    const custoTempo = calcularCustoTempoMinutos(base.tempo_preparo || 0);
    return (custoTotal + custoTempo) / base.peso_final_real_gramas;
  };

  const percentualSobreFaturamento = custosGlobais.faturamento_meta > 0 ? (totalCustosMensaisFixos / custosGlobais.faturamento_meta) * 100 : 0;
  const valorDaHoraCalc = custosGlobais.horas_mes > 0 ? (totalCustosMensaisFixos / custosGlobais.horas_mes) : 0;

  const taxasUniversais = itensCusto.filter(i => i.is_percentual && i.categoria !== 'Canais de Venda (Plataformas)');
  const totalTaxasPercentuaisGerais = taxasUniversais.reduce((acc, i) => acc + parseFloat(i.valor), 0);
  const listaCanaisDeVenda = itensCusto.filter(i => i.categoria === 'Canais de Venda (Plataformas)');

  const categoriasIniciais = ['Despesas Administrativas', 'Mão de Obra', 'Despesas Comerciais', 'Custos de Venda (Taxas)'];
  const categoriasDoBanco = [...new Set(itensCusto.map(i => i.categoria))];
  const todasCategoriasAgrupadas = [...new Set([...categoriasIniciais, ...categoriasDoBanco])].filter(c => c !== 'Canais de Venda (Plataformas)');

  // ==========================================
  // HANDLERS ABA 1: BASES
  // ==========================================
  const adicionarInsumoNaBase = (e) => {
    e.preventDefault();
    let alvoId = baseInsumoSelecionadoId;
    if (!alvoId && prodsFiltradosLoja.length > 0) alvoId = prodsFiltradosLoja[0].id.toString();

    if (!alvoId || !baseQtdUsada || parseFloat(baseQtdUsada) <= 0) {
      mostrarNotificacao('Selecione o insumo e informe uma quantidade maior que zero!', 'erro'); return;
    }
    const prod = bancoProdutos.find(p => p.id === parseInt(alvoId));
    if (!prod) return;
    if (baseIngredientes.some(i => i.produto_id === prod.id)) {
      mostrarNotificacao('Este ingrediente já está na panela!', 'erro'); return;
    }

    setBaseIngredientes([...baseIngredientes, {
      id_interno: Date.now() + Math.random(),
      produto_id: prod.id,
      nome: prod.nome,
      marca: prod.marca,
      quantidade_usada: parseFloat(baseQtdUsada),
      peso_calculado_gramas: parseFloat(baseQtdUsada), // O motor novo faz a conversão direta, peso bruto não é mais obrigatório aqui
      unidade_medida: prod.unidade_medida,
      tamanho_embalagem: prod.tamanho_embalagem,
      preco_base: prod.preco_base || 0
    }]);
    setBaseQtdUsada('');
    mostrarNotificacao('Insumo adicionado à Base!');
  };

  const handleSalvarFichaBase = async (e) => {
    e.preventDefault();
    if (!baseNome) { mostrarNotificacao('Dê um nome para a receita base!', 'erro'); return; }
    if (baseIngredientes.length === 0) { mostrarNotificacao('Insira pelo menos um ingrediente na receita!', 'erro'); return; }
    if (!basePesoPronto || parseFloat(basePesoPronto) <= 0) { mostrarNotificacao('Informe o peso final pronto pós-cocção!', 'erro'); return; }

    setSalvandoBase(true);
    const pr = parseFloat(basePesoPronto);
    const minPreparo = parseInt(baseTempoPreparo) || 0;

    if (edicaoBaseId) {
      await supabase.from('receitas').update({ nome: baseNome, peso_final_real_gramas: pr, peso_porcao_gramas: pr, tempo_preparo: minPreparo }).eq('id', edicaoBaseId);
      await supabase.from('ingredientes_receita').delete().eq('receita_id', edicaoBaseId);
      await supabase.from('ingredientes_receita').insert(baseIngredientes.map(i => ({ receita_id: edicaoBaseId, produto_id: i.produto_id, quantidade_usada: i.quantidade_usada })));
      mostrarNotificacao('Base atualizada com sucesso!');
    } else {
      const { data: novaRec } = await supabase.from('receitas').insert([{ nome: baseNome, rendimento_unidades: 1, peso_porcao_gramas: pr, peso_final_real_gramas: pr, tempo_preparo: minPreparo }]).select();
      await supabase.from('ingredientes_receita').insert(baseIngredientes.map(i => ({ receita_id: novaRec[0].id, produto_id: i.produto_id, quantidade_usada: i.quantidade_usada })));
      mostrarNotificacao('Nova base catalogada!');
    }

    setBaseNome(''); setBasePesoPronto(''); setBaseTempoPreparo(''); setBaseIngredientes([]); setEdicaoBaseId(null);
    setAbaBases('LISTA');
    buscarDadosIniciais();
    setSalvandoBase(false);
  };

  const expandirFichaBase = async (rec) => {
    if (edicaoBaseId) return;
    setBaseExpandida(rec);
    const { data } = await supabase.from('ingredientes_receita').select('quantidade_usada, produtos_cadastrados(*)').eq('receita_id', rec.id);
    if (data) {
      setBaseDetalhesExpandidos(data.map(it => {
        const p = it.produtos_cadastrados;
        return { nome: p.nome, marca: p.marca, quantidade_usada: it.quantidade_usada, peso_calculado_gramas: it.quantidade_usada, tamanho_embalagem: p.tamanho_embalagem, unidade_medida: p.unidade_medida, preco_base: p.preco_base || 0 };
      }));
    }
  };

  // ==========================================
  // HANDLERS ABA 2: EMBALAGENS
  // ==========================================
  const handleSalvarEmbalagem = async (e) => {
    e.preventDefault();
    if (!embNome || !embQtd || !embValor) { mostrarNotificacao('Preencha os campos da embalagem!', 'erro'); return; }

    setSalvandoEmb(true);
    const payload = { nome: embNome, marca: embMarca || 'Sem Marca', qtd_unidades: parseInt(embQtd), valor_compra: parseFloat(embValor) };

    if (edicaoEmbId) {
      await supabase.from('embalagens').update(payload).eq('id', edicaoEmbId);
      mostrarNotificacao('Embalagem atualizada!');
    } else {
      await supabase.from('embalagens').insert([payload]);
      mostrarNotificacao('Embalagem salva no estoque!');
    }
    setEmbNome(''); setEmbMarca(''); setEmbQtd(''); setEmbValor(''); setEdicaoEmbId(null);
    setModalEmbAberto(false);
    buscarDadosIniciais();
    setSalvandoEmb(false);
  };

  // ==========================================
  // HANDLERS ABA 3: MONTAGEM FINAL
  // ==========================================
  const handleMudarTipoPecaMontagem = (novoTipo) => {
    setMontTipoPeca(novoTipo);
    if (novoTipo === 'BASE' && listaReceitas.length > 0) setMontPecaId(listaReceitas[0].id.toString());
    else if (novoTipo === 'EMBALAGEM' && listaEmbalagens.length > 0) setMontPecaId(listaEmbalagens[0].id.toString());
    else if (novoTipo === 'INSUMO' && bancoProdutos.length > 0) setMontPecaId(bancoProdutos[0].id.toString());
    else setMontPecaId('');
  };

  const iniciarEdicaoMontagem = async (e, mont) => {
    e.stopPropagation();
    setEdicaoMontId(mont.id);
    setMontNome(mont.nome);
    setMontTempoMontagem(mont.tempo_montagem?.toString() || '');
    setMontExpandida(null); 

    setCarregando(true);
    const { data } = await supabase.from('itens_montagem').select('*').eq('montagem_id', mont.id);
    if (data) {
      setMontItensTemp(data.map(it => {
        let txtDetalhe = `${it.quantidade} ${it.tipo === 'EMBALAGEM' ? 'un' : 'g/un'}`;
        return {
          id_interno: Date.now() + Math.random(),
          tipo: it.tipo,
          item_id: it.item_id,
          nome_exibicao: it.nome_exibicao,
          descricaoDetalhe: txtDetalhe,
          quantidade: it.quantidade,
          custo_calculado: it.custo_calculado
        };
      }));
    }
    setCarregando(false);
    setAbaMontagem('NOVA');
  };

  const adicionarPecaNaMontagem = (e) => {
    e.preventDefault();
    let alvoId = montPecaId;
    if (!alvoId) {
      if (montTipoPeca === 'BASE' && listaReceitas.length > 0) alvoId = listaReceitas[0].id.toString();
      else if (montTipoPeca === 'EMBALAGEM' && listaEmbalagens.length > 0) alvoId = listaEmbalagens[0].id.toString();
      else if (montTipoPeca === 'INSUMO' && bancoProdutos.length > 0) alvoId = bancoProdutos[0].id.toString();
    }

    if (!alvoId || !montQtdPeca || parseFloat(montQtdPeca) <= 0) {
      mostrarNotificacao('Selecione um componente e digite uma quantidade maior que zero!', 'erro'); return;
    }

    const qtdNum = parseFloat(montQtdPeca);
    let nomeExibicao = '', custoCalc = 0, detalhe = '';

    if (montTipoPeca === 'BASE') {
      const base = listaReceitas.find(r => r.id === parseInt(alvoId));
      if (!base) return;
      custoCalc = obterCustoGramaBase(base.id) * qtdNum;
      nomeExibicao = `[Massa/Base] ${base.nome}`;
      detalhe = `${qtdNum}g usadas`;
    } else if (montTipoPeca === 'EMBALAGEM') {
      const emb = listaEmbalagens.find(em => em.id === parseInt(alvoId));
      if (!emb) return;
      custoCalc = (emb.valor_compra / emb.qtd_unidades) * qtdNum;
      nomeExibicao = `[Embalagem] ${emb.nome}`;
      detalhe = `${qtdNum} unidades`;
    } else if (montTipoPeca === 'INSUMO') {
      const ins = bancoProdutos.find(p => p.id === parseInt(alvoId));
      if (!ins) return;
      custoCalc = callbackCustoItem({ preco_base: ins.preco_base, unidade_medida: ins.unidade_medida, tamanho_embalagem: ins.tamanho_embalagem, quantidade_usada: qtdNum, peso_calculado_gramas: qtdNum });
      nomeExibicao = `[Topping] ${ins.nome}`;
      detalhe = `${qtdNum} ${ins.unidade_medida.toLowerCase()}`;
    }

    setMontItensTemp([...montItensTemp, {
      id_interno: Date.now() + Math.random(),
      tipo: montTipoPeca,
      item_id: parseInt(alvoId),
      nome_exibicao: nomeExibicao,
      descricaoDetalhe: detalhe,
      quantidade: qtdNum,
      custo_calculado: custoCalc
    }]);

    setMontQtdPeca('');
    mostrarNotificacao('Componente inserido no pote!');
  };

  const handleSalvarProdutoMontado = async () => {
    if (!montNome) { mostrarNotificacao('Informe o nome de venda do produto!', 'erro'); return; }
    if (montItensTemp.length === 0) { mostrarNotificacao('Adicione componentes à montagem!', 'erro'); return; }

    setSalvandoMontagem(true);
    
    // Soma custo das peças com o custo do tempo preenchido
    const custoPecas = montItensTemp.reduce((acc, i) => acc + i.custo_calculado, 0);
    const minMont = parseInt(montTempoMontagem) || 0;
    const custoTempoMontagem = calcularCustoTempoMinutos(minMont);
    const custoTotal = custoPecas + custoTempoMontagem;

    if (edicaoMontId) {
      await supabase.from('cardapio_montagens').update({ nome: montNome, custo_total: custoTotal, tempo_montagem: minMont }).eq('id', edicaoMontId);
      await supabase.from('itens_montagem').delete().eq('montagem_id', edicaoMontId);
      const payloadItens = montItensTemp.map(it => ({ montagem_id: edicaoMontId, tipo: it.tipo, item_id: it.item_id, nome_exibicao: it.nome_exibicao, quantidade: it.quantidade, custo_calculado: it.custo_calculado }));
      await supabase.from('itens_montagem').insert(payloadItens);
      mostrarNotificacao('Montagem alterada com sucesso! ✏️');
    } else {
      const { data: novaMont, error } = await supabase.from('cardapio_montagens').insert([{ nome: montNome, preco_venda: 0, custo_total: custoTotal, tempo_montagem: minMont }]).select();
      if (error) { mostrarNotificacao('Erro: ' + error.message, 'erro'); setSalvandoMontagem(false); return; }
      const payloadItens = montItensTemp.map(it => ({ montagem_id: novaMont[0].id, tipo: it.tipo, item_id: it.item_id, nome_exibicao: it.nome_exibicao, quantidade: it.quantidade, custo_calculado: it.custo_calculado }));
      await supabase.from('itens_montagem').insert(payloadItens);
      mostrarNotificacao('Produto montado salvo com sucesso! 💎');
    }

    setMontNome(''); setMontTempoMontagem(''); setMontItensTemp([]); setEdicaoMontId(null);
    setAbaMontagem('LISTA');
    buscarDadosIniciais();
    setSalvandoMontagem(false);
  };

  const expandirProdutoMontado = async (mont) => {
    setMontExpandida(mont);
    const { data } = await supabase.from('itens_montagem').select('*').eq('montagem_id', mont.id);
    if (data) setMontDetalhesExpandidos(data);
  };

  // ==========================================
  // HANDLERS ABA 5: CUSTOS E TAXAS
  // ==========================================
  const handleSalvarItemCusto = async (e) => {
    e.preventDefault();
    if (!formCusto.nome || !formCusto.valor) { mostrarNotificacao('Preencha a descrição e o valor!', 'erro'); return; }
    setSalvandoCusto(true);

    const categoriaFinal = formCusto.categoria === 'NOVA' ? formCusto.novaCategoria : formCusto.categoria;
    const payload = { nome: formCusto.nome, valor: parseFloat(formCusto.valor), categoria: categoriaFinal, is_percentual: formCusto.is_percentual };

    if (edicaoCustoId) {
      await supabase.from('delivery_custos_itens').update(payload).eq('id', edicaoCustoId);
      mostrarNotificacao('Custo modificado!');
    } else {
      await supabase.from('delivery_custos_itens').insert([payload]);
      mostrarNotificacao('Nova despesa registrada!');
    }
    setModalCustoAberto(false);
    buscarDadosIniciais();
    setSalvandoCusto(false);
  };

  const confirmarExclusaoGeral = async () => {
    const { tipo, item } = modalExclusao;
    if (!item) return;

    if (tipo === 'BASE') {
      await supabase.from('receitas').delete().eq('id', item.id);
      mostrarNotificacao('Receita base excluída do cardápio.');
    } else if (tipo === 'EMBALAGEM') {
      await supabase.from('embalagens').delete().eq('id', item.id);
      mostrarNotificacao('Embalagem excluída do estoque.');
    } else if (tipo === 'MONTAGEM') {
      await supabase.from('cardapio_montagens').delete().eq('id', item.id);
      mostrarNotificacao('Produto final excluído das vendas.');
    } else if (tipo === 'CUSTO') {
      await supabase.from('delivery_custos_itens').delete().eq('id', item.id);
      mostrarNotificacao('Despesa removida do centro de custos.');
    }

    setModalExclusao({ aberto: false, tipo: '', item: null });
    buscarDadosIniciais();
  };

  // Auxiliares visuais para as quebras térmicas de Bases
  const custoInsumosBaseCru = baseIngredientes.reduce((acc, i) => acc + callbackCustoItem(i), 0);
  
  return (
    <div>
      <button className="btn-voltar" onClick={() => setSistemaAtivo('HOME')}>🏠 Voltar ao Hub</button>

      <header className="header-app">
        <h1 style={{ color: moduloAtivo === 'BASES' ? '#7c3aed' : moduloAtivo === 'EMBALAGENS' ? '#ea580c' : moduloAtivo === 'MONTAGEM' ? '#16a34a' : moduloAtivo === 'SIMULADOR' ? '#0369a1' : '#2563eb', margin: 0, fontSize: '32px', fontWeight: '850' }}>Gestão de Delivery 🛵</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px', fontWeight: '500' }}>Ficha técnica, estoque de embalagens, montagem comercial e mark-up</p>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button type="button" onClick={() => { setModuloAtivo('BASES'); setEdicaoBaseId(null); setAbaBases('LISTA'); }} style={{ flex: 1, minWidth: '95px', padding: '12px', borderRadius: '10px', fontWeight: '800', border: moduloAtivo === 'BASES' ? '2px solid #7c3aed' : '1px solid #d1d5db', backgroundColor: moduloAtivo === 'BASES' ? '#f5f3ff' : '#fff', color: moduloAtivo === 'BASES' ? '#7c3aed' : '#4b5563', cursor: 'pointer', fontSize: '12px' }}>🍳 Bases</button>
        <button type="button" onClick={() => { setModuloAtivo('EMBALAGENS'); setModalEmbAberto(false); }} style={{ flex: 1, minWidth: '95px', padding: '12px', borderRadius: '10px', fontWeight: '800', border: moduloAtivo === 'EMBALAGENS' ? '2px solid #ea580c' : '1px solid #d1d5db', backgroundColor: moduloAtivo === 'EMBALAGENS' ? '#fff7ed' : '#fff', color: moduloAtivo === 'EMBALAGENS' ? '#ea580c' : '#4b5563', cursor: 'pointer', fontSize: '12px' }}>📦 Embalagens</button>
        <button type="button" onClick={() => { setModuloAtivo('MONTAGEM'); setAbaMontagem('LISTA'); setEdicaoMontId(null); }} style={{ flex: 1, minWidth: '100px', padding: '12px', borderRadius: '10px', fontWeight: '800', border: moduloAtivo === 'MONTAGEM' ? '2px solid #16a34a' : '1px solid #d1d5db', backgroundColor: moduloAtivo === 'MONTAGEM' ? '#f0fdf4' : '#fff', color: moduloAtivo === 'MONTAGEM' ? '#16a34a' : '#4b5563', cursor: 'pointer', fontSize: '12px' }}>🍔 Montagem</button>
        <button type="button" onClick={() => setModuloAtivo('SIMULADOR')} style={{ flex: 1, minWidth: '110px', padding: '12px', borderRadius: '10px', fontWeight: '800', border: moduloAtivo === 'SIMULADOR' ? '2px solid #0369a1' : '1px solid #d1d5db', backgroundColor: moduloAtivo === 'SIMULADOR' ? '#f0f9ff' : '#fff', color: moduloAtivo === 'SIMULADOR' ? '#0369a1' : '#4b5563', cursor: 'pointer', fontSize: '12px' }}>🏷️ Simulador</button>
        <button type="button" onClick={() => setModuloAtivo('CUSTOS')} style={{ flex: 1, minWidth: '100px', padding: '12px', borderRadius: '10px', fontWeight: '800', border: moduloAtivo === 'CUSTOS' ? '2px solid #2563eb' : '1px solid #d1d5db', backgroundColor: moduloAtivo === 'CUSTOS' ? '#eff6ff' : '#fff', color: moduloAtivo === 'CUSTOS' ? '#2563eb' : '#4b5563', cursor: 'pointer', fontSize: '12px' }}>💰 Custos</button>
      </div>

      {carregando && <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Sincronizando dados...</p>}

      {/* ==================================================== */}
      {/* MÓDULO 1: BASES E MASSAS                             */}
      {/* ==================================================== */}
      {moduloAtivo === 'BASES' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {abaBases === 'LISTA' ? (
            <div className="grid-layout">
              <div className={baseExpandida ? '' : 'col-inteira'}>
                <section className="card-app">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>Receitas Base Cadastradas</h3>
                    <button type="button" onClick={() => { setAbaBases('NOVA'); setEdicaoBaseId(null); setBaseNome(''); setBasePesoPronto(''); setBaseTempoPreparo(''); setBaseIngredientes([]); }} style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>＋ Adicionar Base</button>
                  </div>
                  {listaReceitas.length === 0 ? <p style={{ textAlign: 'center', color: '#9ca3af' }}>Nenhuma base cadastrada.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {listaReceitas.map(rec => (
                        <div key={rec.id} onClick={() => expandirFichaBase(rec)} style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: baseExpandida?.id === rec.id ? '#f5f3ff' : '#f9fafb', borderColor: baseExpandida?.id === rec.id ? '#a78bfa' : '#e5e7eb' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '16px', color: '#1f2937' }}>{rec.nome}</div>
                            <small style={{ color: '#6b7280', fontWeight: '500' }}>Rendimento pronto: {rec.peso_final_real_gramas || 0}g</small>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button type="button" onClick={async (e) => {
                              e.stopPropagation(); setEdicaoBaseId(rec.id); setBaseNome(rec.nome); setBasePesoPronto(rec.peso_final_real_gramas?.toString() || ''); setBaseTempoPreparo(rec.tempo_preparo?.toString() || ''); setBaseExpandida(null);
                              const { data } = await supabase.from('ingredientes_receita').select('quantidade_usada, produtos_cadastrados(*)').eq('receita_id', rec.id);
                              if (data) {
                                setBaseIngredientes(data.map(it => {
                                  const p = it.produtos_cadastrados;
                                  return { id_interno: Date.now() + Math.random(), produto_id: p.id, nome: p.nome, marca: p.marca, quantidade_usada: it.quantidade_usada, peso_calculado_gramas: it.quantidade_usada, tamanho_embalagem: p.tamanho_embalagem, unidade_medida: p.unidade_medida, preco_base: p.preco_base || 0 };
                                }));
                              }
                              setAbaBases('NOVA');
                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '6px' }}>✏️</button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setModalExclusao({ aberto: true, tipo: 'BASE', item: rec }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '6px' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {baseExpandida && (() => {
                const tempo = baseExpandida.tempo_preparo || 0;
                const cTempo = calcularCustoTempoMinutos(tempo);
                const pPronto = baseExpandida.peso_final_real_gramas || 1;
                const cInsumos = baseDetalhesExpandidos.reduce((acc, i) => acc + callbackCustoItem(i), 0);
                const cTotalReal = cInsumos + cTempo;

                return (
                  <div className="card-app">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '14px' }}>
                      <div><h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#7c3aed' }}>{baseExpandida.nome}</h2><small style={{ color: '#6b7280', fontWeight: '600' }}>Rendimento: {pPronto}g</small></div>
                      <button type="button" onClick={() => setBaseExpandida(null)} style={{ backgroundColor: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Fechar</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {baseDetalhesExpandidos.map((ing, i) => (
                        <div key={i} style={{ padding: '8px 0', borderBottom: '1px dashed #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <div><div style={{ fontWeight: '600', color: '#374151' }}>{ing.nome} <small style={{color:'#9ca3af'}}>({ing.marca})</small></div><small style={{ color: '#6b7280' }}>Usa {ing.quantidade_usada}{ing.unidade_medida.toLowerCase()}</small></div>
                          <span style={{ fontWeight: '700', alignSelf: 'center', color: '#4b5563' }}>R$ {callbackCustoItem(ing).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '14px', backgroundColor: '#f5f3ff', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}><span>⏱️ Mão de Obra ({tempo} min):</span><span style={{ fontWeight: '600' }}>R$ {cTempo.toFixed(2)}</span></div>
                      <div style={{ borderTop: '1px dashed #ccc', margin: '4px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '850', color: '#7c3aed', fontSize: '15px' }}><span>📉 CUSTO TOTAL DA BASE:</span><span>R$ {cTotalReal.toFixed(2)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#7c3aed', fontSize: '12px' }}><span>VALOR DA GRAMA (g):</span><span>R$ {(cTotalReal / pPronto).toFixed(4)} /g</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid-layout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <section className="card-app">
                  <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700', color: edicaoBaseId ? '#ea580c' : '#1f2937' }}>{edicaoBaseId ? '✏️ 1. Alterar Massa/Base' : '1. Informações da Nova Massa/Base'}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" value={baseNome} onChange={(e) => setBaseNome(e.target.value)} placeholder="Nome da Base (ex: Massa de Brownie, Geleia)" className="input-padrao" required />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#ea580c' }}>PESO FINAL (g)</label><input type="number" value={basePesoPronto} onChange={(e) => setBasePesoPronto(e.target.value)} placeholder="Balança após preparo" className="input-padrao" required /></div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#7c3aed' }}>TEMPO PREPARO (Minutos)</label><input type="number" value={baseTempoPreparo} onChange={(e) => setBaseTempoPreparo(e.target.value)} placeholder="Ex: 45" className="input-padrao" required /></div>
                    </div>
                  </div>
                </section>
                <section className="card-app">
                  <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700', color: '#7c3aed' }}>2. Adicionar Insumos à Panela</h3>
                  <form onSubmit={adicionarInsumoNaBase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={baseInsumoSelecionadoId} onChange={(e) => setBaseInsumoSelecionadoId(e.target.value)} className="select-padrao" required>
                      <option value="">-- Selecione o Insumo --</option>
                      {prodsFiltradosLoja.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.marca})</option>)}
                    </select>
                    <input type="number" step="0.001" value={baseQtdUsada} onChange={(e) => setBaseQtdUsada(e.target.value)} placeholder="Quantidade usada (ex: 1 lata, 200g)" className="input-padrao" required />
                    <button type="submit" style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>＋ Inserir Insumo</button>
                  </form>
                </section>
              </div>

              <div>
                {baseIngredientes.length > 0 ? (
                  <section className="card-app">
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>Resumo de Custos e Rendimento</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0', maxHeight: '180px', overflowY: 'auto' }}>
                      {baseIngredientes.map(it => (
                        <div key={it.id_interno} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '14px', alignItems: 'center' }}>
                          <span><strong>{it.nome}</strong> <small style={{color: '#6b7280'}}>({it.quantidade_usada}{it.unidade_medida.toLowerCase()})</small></span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontWeight: '600' }}>R$ {callbackCustoItem(it).toFixed(2)}</span><button type="button" onClick={() => setBaseIngredientes(baseIngredientes.filter(x => x.id_interno !== it.id_interno))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button></div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const cTempo = calcularCustoTempoMinutos(baseTempoPreparo);
                      const pReal = parseFloat(basePesoPronto) || 0;
                      return (
                        <div style={{ padding: '12px', backgroundColor: '#f5f3ff', borderRadius: '8px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}><span>💰 Custo Insumos:</span><span style={{ fontWeight: '600' }}>R$ {custoInsumosBaseCru.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}><span>⏱️ Mão de Obra ({baseTempoPreparo || 0} min):</span><span style={{ fontWeight: '600', color: '#7c3aed' }}>R$ {cTempo.toFixed(2)}</span></div>
                          
                          <div style={{ borderTop: '1px solid #ddd', margin: '4px 0' }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#16a34a', fontSize: '15px' }}><span>CUSTO TOTAL:</span><span>R$ {(custoInsumosBaseCru + cTempo).toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#7c3aed', fontSize: '13px', marginTop: '2px' }}><span>CUSTO POR GRAMA:</span><span>R$ {(pReal > 0 ? (custoInsumosBaseCru + cTempo) / pReal : 0).toFixed(4)} /g</span></div>
                        </div>
                      )
                    })()}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => { setAbaBases('LISTA'); setEdicaoBaseId(null); }} style={{ width: '35%', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>Cancelar</button>
                      <button type="button" onClick={handleSalvarFichaBase} disabled={salvandoBase} style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>{salvandoBase ? 'Salvando...' : '🔒 Salvar Base'}</button>
                    </div>
                  </section>
                ) : <div className="card-app" style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}><p style={{ margin: 0, fontSize: '14px' }}>Insira os insumos da receita base para calcular os custos.</p></div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MÓDULO 2: EMBALAGENS                                 */}
      {/* ==================================================== */}
      {moduloAtivo === 'EMBALAGENS' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <section className="card-app">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#ea580c' }}>Catálogo de Embalagens ({listaEmbalagens.length})</h3>
              <button type="button" onClick={() => { setEdicaoEmbId(null); setEmbNome(''); setEmbMarca(''); setEmbQtd(''); setEmbValor(''); setModalEmbAberto(true); }} style={{ backgroundColor: '#ea580c', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>＋ Nova Embalagem</button>
            </div>
            {listaEmbalagens.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}><span style={{ fontSize: '32px' }}>📦</span><p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Nenhuma embalagem cadastrada.</p></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {listaEmbalagens.map(emb => {
                  const custoUn = emb.qtd_unidades > 0 ? emb.valor_compra / emb.qtd_unidades : 0;
                  return (
                    <div key={emb.id} style={{ padding: '14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px', color: '#1f2937' }}>{emb.nome} <small style={{color: '#6b7280', fontWeight: '500'}}>({emb.marca || 'Sem Marca'})</small></div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>Pacote com <strong>{emb.qtd_unidades} un</strong> pago <strong>R$ {emb.valor_compra.toFixed(2)}</strong></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right', backgroundColor: '#fff7ed', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fed7aa' }}><small style={{ fontSize: '9px', color: '#9a3412', display: 'block', fontWeight: '800' }}>CUSTO UNITÁRIO</small><span style={{ fontWeight: '850', color: '#ea580c', fontSize: '15px' }}>R$ {custoUn.toFixed(2)}</span></div>
                        <button type="button" onClick={() => { setEdicaoEmbId(emb.id); setEmbNome(emb.nome); setEmbMarca(emb.marca || ''); setEmbQtd(emb.qtd_unidades.toString()); setEmbValor(emb.valor_compra.toString()); setModalEmbAberto(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                        <button type="button" onClick={() => setModalExclusao({ aberto: true, tipo: 'EMBALAGEM', item: emb })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          {modalEmbAberto && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
              <div className="card-app" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#ea580c', fontSize: '18px', fontWeight: '800', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>{edicaoEmbId ? '✏️ Alterar Embalagem' : '📦 Nova Embalagem'}</h3>
                <form onSubmit={handleSalvarEmbalagem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>NOME DA EMBALAGEM</label><input type="text" value={embNome} onChange={(e) => setEmbNome(e.target.value)} placeholder="Ex: Pote de Acetato Quadrado" className="input-padrao" required /></div>
                  <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>MARCA / FABRICANTE</label><input type="text" value={embMarca} onChange={(e) => setEmbMarca(e.target.value)} placeholder="Ex: Galvanotek" className="input-padrao" /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>QTD NO PACOTE (un)</label><input type="number" value={embQtd} onChange={(e) => setEmbQtd(e.target.value)} placeholder="Ex: 50" className="input-padrao" min="1" required /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>VALOR PAGO (R$)</label><input type="number" step="0.01" value={embValor} onChange={(e) => setEmbValor(e.target.value)} placeholder="Ex: 45.00" className="input-padrao" required /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setModalEmbAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" disabled={salvandoEmb} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#ea580c', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>{salvandoEmb ? 'Salvando...' : 'Salvar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MÓDULO 3: MONTAGEM FINAL EM POTE                     */}
      {/* ==================================================== */}
      {moduloAtivo === 'MONTAGEM' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {abaMontagem === 'LISTA' ? (
            <section className="card-app">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>Produtos no Cardápio de Vendas</h3>
                <button type="button" onClick={() => { setAbaMontagem('NOVA'); setMontNome(''); setMontTempoMontagem(''); setMontItensTemp([]); setEdicaoMontId(null); }} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>＋ Montar Produto</button>
              </div>
              {listaMontagens.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>Nenhum produto final montado.</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {listaMontagens.map(mont => (
                    <div key={mont.id} onClick={async () => {
                      setMontExpandida(mont);
                      const { data } = await supabase.from('itens_montagem').select('*').eq('montagem_id', mont.id);
                      if (data) setMontDetalhesExpandidos(data);
                    }} style={{ padding: '14px', backgroundColor: montExpandida?.id === mont.id ? '#f0fdf4' : '#f9fafb', border: '1px solid', borderColor: montExpandida?.id === mont.id ? '#86efac' : '#e5e7eb', borderRadius: '10px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontWeight: '800', fontSize: '16px', color: '#1f2937' }}>{mont.nome}</div><small style={{ color: '#6b7280' }}>Clique para ver as peças</small></div>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}><span style={{ fontSize: '9px', fontWeight: '800', color: '#16a34a', display: 'block' }}>CUSTO DA PEÇA</span><span style={{ fontWeight: '900', fontSize: '16px', color: '#16a34a' }}>R$ {mont.custo_total.toFixed(2)}</span></div>
                          <button type="button" onClick={async (e) => {
                            e.stopPropagation();
                            setEdicaoMontId(mont.id); setMontNome(mont.nome); setMontTempoMontagem(mont.tempo_montagem?.toString() || ''); setMontExpandida(null); setCarregando(true);
                            const { data } = await supabase.from('itens_montagem').select('*').eq('montagem_id', mont.id);
                            if (data) {
                              setMontItensTemp(data.map(it => ({ id_interno: Date.now() + Math.random(), tipo: it.tipo, item_id: it.item_id, nome_exibicao: it.nome_exibicao, descricaoDetalhe: `${it.quantidade} ${it.tipo === 'EMBALAGEM' ? 'un' : 'g/un'}`, quantidade: it.quantidade, custo_calculado: it.custo_calculado })));
                            }
                            setCarregando(false); setAbaMontagem('NOVA');
                          }} style={{ background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer' }} title="Editar Peças">✏️</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setModalExclusao({ aberto: true, tipo: 'MONTAGEM', item: mont }); }} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      </div>
                      {montExpandida?.id === mont.id && (
                        <div style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4b5563' }}>📋 Componentes no Recipiente</h4>
                          {montDetalhesExpandidos.map(det => (
                            <div key={det.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                              <span>{det.nome_exibicao} <small style={{color:'#9ca3af'}}>({det.quantidade})</small></span>
                              <span style={{ fontWeight: '600' }}>R$ {det.custo_calculado.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="grid-layout">
              <section className="card-app">
                <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '16px', fontWeight: '700', color: edicaoMontId ? '#ea580c' : '#16a34a' }}>{edicaoMontId ? '✏️ Alterar Produto Montado' : 'Montar Novo Produto'}</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>NOME DO PRODUTO (CARDÁPIO)</label><input type="text" value={montNome} onChange={(e) => setMontNome(e.target.value)} placeholder="Ex: Copo GG" className="input-padrao" required /></div>
                  <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', display: 'block', marginBottom: '4px' }}>TEMPO DE FINALIZAÇÃO</label><input type="number" value={montTempoMontagem} onChange={(e) => setMontTempoMontagem(e.target.value)} placeholder="Ex: 5 min" className="input-padrao" required /></div>
                </div>

                <h4 style={{ margin: '14px 0 10px 0', fontSize: '14px', color: '#4b5563', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>Adicionar Peças ao Produto</h4>
                <form onSubmit={adicionarPecaNaMontagem} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>TIPO DE PEÇA</label>
                    <select value={montTipoPeca} onChange={(e) => handleMudarTipoPecaMontagem(e.target.value)} className="select-padrao">
                      <option value="BASE">🍳 Base / Massa Pronta (Pós-Redução)</option>
                      <option value="EMBALAGEM">📦 Embalagem / Pote</option>
                      <option value="INSUMO">🍫 Topping Extra (Fruta / Insumo Cru)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>SELECIONE O ITEM CORRESPONDENTE</label>
                    <select value={montPecaId} onChange={(e) => setMontPecaId(e.target.value)} className="select-padrao" required>
                      <option value="">-- Selecione abaixo --</option>
                      {montTipoPeca === 'BASE' && listaReceitas.map(r => <option key={r.id} value={r.id}>{r.nome} (Ref: R$ {obterCustoGramaBase(r.id).toFixed(3)}/g)</option>)}
                      {montTipoPeca === 'EMBALAGEM' && listaEmbalagens.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      {montTipoPeca === 'INSUMO' && bancoProdutos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>{montTipoPeca === 'EMBALAGEM' ? 'QUANTIDADE (Unidades)' : 'QUANTIDADE / PESO USADO'}</label><input type="number" step="0.01" value={montQtdPeca} onChange={(e) => setMontQtdPeca(e.target.value)} placeholder="Ex: 150 ou 1" className="input-padrao" required /></div>
                  <button type="submit" style={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}>＋ Inserir Componente</button>
                </form>
              </section>

              <section className="card-app">
                <h3 style={{ marginTop: 0, borderBottom: '1px solid #f3f4f6', paddingBottom: '10px', fontSize: '15px' }}>Resumo de Custos do Pote</h3>
                {montItensTemp.length === 0 ? <p style={{ fontSize: '13px', color: '#9ca3af' }}>Vazio.</p> : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                      {montItensTemp.map(it => (
                        <div key={it.id_interno} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                          <div><div style={{ fontWeight: '700', color: it.tipo === 'BASE' ? '#7c3aed' : it.tipo === 'EMBALAGEM' ? '#ea580c' : '#2563eb' }}>{it.nome_exibicao}</div><small style={{ color: '#6b7280' }}>Uso: {it.descricaoDetalhe}</small></div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><span style={{ fontWeight: '700' }}>R$ {it.custo_calculado.toFixed(2)}</span><button type="button" onClick={() => setMontItensTemp(montItensTemp.filter(x => x.id_interno !== it.id_interno))} style={{ background:'none', border:'none', cursor:'pointer' }}>🗑️</button></div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const cPecas = montItensTemp.reduce((acc, i) => acc + i.custo_calculado, 0);
                      const tMont = parseInt(montTempoMontagem) || 0;
                      const cTempoM = calcularCustoTempoMinutos(tMont);
                      return (
                        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}><span>Custo das Peças:</span><span>R$ {cPecas.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563', marginBottom: '6px' }}><span>Mão de Obra ({tMont} min):</span><span>R$ {cTempoM.toFixed(2)}</span></div>
                          <div style={{ borderTop: '1px solid #bbf7d0', margin: '4px 0 8px 0' }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#16a34a', fontSize: '16px' }}><span>CUSTO TOTAL DO PRODUTO:</span><span>R$ {(cPecas + cTempoM).toFixed(2)}</span></div>
                        </div>
                      );
                    })()}
                  </>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="button" onClick={() => { setAbaMontagem('LISTA'); setEdicaoMontId(null); setMontNome(''); setMontTempoMontagem(''); setMontItensTemp([]); }} style={{ width: '35%', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                  <button type="button" onClick={handleSalvarProdutoMontado} disabled={salvandoMontagem} style={{ flex: 1, backgroundColor: edicaoMontId ? '#ea580c' : '#16a34a', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>{salvandoMontagem ? 'Salvando...' : edicaoMontId ? '💾 Salvar Alterações' : '💾 Finalizar Montagem'}</button>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MÓDULO 4: SIMULADOR DE CARDÁPIO COMPLETO             */}
      {/* ==================================================== */}
      {moduloAtivo === 'SIMULADOR' && (
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div className="card-app" style={{ marginBottom: '20px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '16px' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0369a1', fontSize: '18px', fontWeight: '850' }}>🏷️ Simulador de Vendas & Cardápio Completo</h3>
            <p style={{ margin: 0, color: '#0284c7', fontSize: '13px' }}>Abaixo estão todos os produtos cadastrados. Defina a margem de lucro líquido individual de cada um para descobrir o preço ideal de venda por plataforma.</p>
          </div>

          {listaMontagens.length === 0 ? (
            <div className="card-app" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Nenhum produto cadastrado na aba Montagem ainda. Monte um item para simular!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {listaMontagens.map(mont => {
                const lucroInput = lucrosSimulador[mont.id] !== undefined ? lucrosSimulador[mont.id] : '20';
                const percFatur = percentualSobreFaturamento / 100;
                const percGerais = totalTaxasPercentuaisGerais / 100;
                const percLuc = (parseFloat(lucroInput) || 0) / 100;

                return (
                  <div key={mont.id} className="card-app" style={{ border: '2px solid #0284c7', backgroundColor: '#f8fafc', padding: '20px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '19px', fontWeight: '900' }}>{mont.nome}</h3>
                        <small style={{ color: '#64748b', fontWeight: '600' }}>Custo Real de Matéria-Prima: <strong style={{color:'#0f172a'}}>R$ {mont.custo_total.toFixed(2)}</strong></small>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#e0f2fe', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <label style={{ fontSize: '11px', fontWeight: '850', color: '#0369a1', margin: 0 }}>LUCRO DESEJADO:</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={lucroInput} 
                          onChange={(e) => setLucrosSimulador({...lucrosSimulador, [mont.id]: e.target.value})} 
                          style={{ width: '55px', fontWeight: '900', color: '#0369a1', backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid #0284c7', textAlign: 'center', fontSize: '16px', outline: 'none' }} 
                        />
                        <span style={{ fontWeight: '900', color: '#0369a1', fontSize: '16px' }}>%</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      {listaCanaisDeVenda.map(canal => {
                        const percCanal = parseFloat(canal.valor) / 100;
                        const somaPerc = percFatur + percGerais + percLuc + percCanal;
                        const denom = 1 - somaPerc;
                        const precoSug = denom > 0 ? mont.custo_total / denom : 0;
                        const invalido = denom <= 0;

                        const key = `${mont.id}_${canal.id}`;
                        const precoManual = parseFloat(precosSimulador[key]);
                        const usaPrecoManual = !isNaN(precoManual) && precoManual > 0;
                        const precoBaseCalculo = usaPrecoManual ? precoManual : precoSug;
                        
                        const deducaoFaturReais = precoBaseCalculo * percFatur;
                        const deducaoGeraisReais = precoBaseCalculo * percGerais;
                        const deducaoCanalReais = precoBaseCalculo * percCanal;
                        const lucroRealReais = precoBaseCalculo - mont.custo_total - deducaoFaturReais - deducaoGeraisReais - deducaoCanalReais;
                        const lucroRealPerc = precoBaseCalculo > 0 ? (lucroRealReais / precoBaseCalculo) * 100 : 0;

                        return (
                          <div key={canal.id} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px' }}>{canal.nome}</span>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', backgroundColor: '#f0f9ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bae6fd' }}>{canal.valor}% taxa</span>
                              </div>
                              
                              {invalido ? (
                                <div style={{ color: '#dc2626', fontSize: '11px', fontWeight: '700', padding: '10px 0' }}>⚠️ Margem &gt; 100%</div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 0' }}>
                                    <small style={{ color: '#64748b', fontSize: '10px', fontWeight: '800' }}>SUGERIDO:</small>
                                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#94a3b8', textDecoration: usaPrecoManual ? 'line-through' : 'none' }}>R$ {precoSug.toFixed(2)}</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px 0', backgroundColor: '#f0f9ff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                    <small style={{ color: '#0369a1', fontSize: '10px', fontWeight: '800' }}>PREÇO REAL:</small>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0369a1' }}>R$</span>
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        value={precosSimulador[key] || ''} 
                                        onChange={(e) => setPrecosSimulador({...precosSimulador, [key]: e.target.value})} 
                                        placeholder={precoSug.toFixed(2)}
                                        style={{ width: '65px', fontWeight: '900', color: '#0369a1', backgroundColor: '#fff', border: '1px solid #7dd3fc', borderRadius: '4px', textAlign: 'center', fontSize: '14px', padding: '2px', outline: 'none' }} 
                                      />
                                    </div>
                                  </div>

                                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: '#64748b' }}>
                                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Custos Fixos:</span><strong style={{color:'#d97706'}}>-R$ {deducaoFaturReais.toFixed(2)}</strong></div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Taxas Gerais:</span><strong style={{color:'#7c3aed'}}>-R$ {deducaoGeraisReais.toFixed(2)}</strong></div>
                                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Canal/App:</span><strong style={{color:'#0284c7'}}>-R$ {deducaoCanalReais.toFixed(2)}</strong></div>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {!invalido && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: lucroRealReais >= 0 ? '#dcfce7' : '#fee2e2', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${lucroRealReais >= 0 ? '#bbf7d0' : '#fecaca'}`, marginTop: '10px' }}>
                                <span style={{ color: lucroRealReais >= 0 ? '#16a34a' : '#dc2626', fontWeight: '850', fontSize: '11px' }}>LUCRO ({lucroRealPerc.toFixed(1)}%):</span>
                                <span style={{ color: lucroRealReais >= 0 ? '#15803d' : '#991b1b', fontWeight: '900', fontSize: '15px' }}>R$ {lucroRealReais.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MÓDULO 5: CUSTOS E PRECIFICAÇÃO                      */}
      {/* ==================================================== */}
      {moduloAtivo === 'CUSTOS' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div className="card-app" style={{ padding: '16px', borderLeft: '4px solid #ef4444', backgroundColor: '#fff' }}><small style={{ color: '#6b7280', fontWeight: '700', fontSize: '11px' }}>CUSTOS FIXOS TOTAIS</small><div style={{ fontSize: '24px', fontWeight: '850', color: '#111827', marginTop: '4px' }}>R$ {totalCustosMensaisFixos.toFixed(2)}</div></div>
            <div className="card-app" style={{ padding: '16px', borderLeft: '4px solid #f59e0b', backgroundColor: '#fff' }}><small style={{ color: '#6b7280', fontWeight: '700', fontSize: '11px' }}>% S/ FATURAMENTO</small><div style={{ fontSize: '24px', fontWeight: '850', color: '#111827', marginTop: '4px' }}>{percentualSobreFaturamento.toFixed(1)}%</div></div>
            <div className="card-app" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6', backgroundColor: '#fff' }}><small style={{ color: '#6b7280', fontWeight: '700', fontSize: '11px' }}>TAXAS GERAIS (NF/Perda)</small><div style={{ fontSize: '24px', fontWeight: '850', color: '#111827', marginTop: '4px' }}>{totalTaxasPercentuaisGerais.toFixed(1)}%</div></div>
            <div className="card-app" style={{ padding: '16px', borderLeft: '4px solid #10b981', backgroundColor: '#fff' }}><small style={{ color: '#6b7280', fontWeight: '700', fontSize: '11px' }}>VALOR/HORA OBTIDO</small><div style={{ fontSize: '24px', fontWeight: '850', color: '#10b981', marginTop: '4px' }}>R$ {valorDaHoraCalc.toFixed(2)}</div></div>
          </div>

          <div className="card-app" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', backgroundColor: '#eff6ff', padding: '18px', border: '1px solid #bfdbfe' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', display: 'block', marginBottom: '6px' }}>FATURAMENTO DESEJADO (Meta Mensal Vendas)</label>
              <input type="number" value={custosGlobais.faturamento_meta} onChange={(e) => setCustosGlobais({...custosGlobais, faturamento_meta: e.target.value})} onBlur={async () => { await supabase.from('delivery_custos_globais').upsert({ id: 1, faturamento_meta: parseFloat(custosGlobais.faturamento_meta) || 0, horas_mes: parseFloat(custosGlobais.horas_mes) || 0 }); mostrarNotificacao('Metas salvas!'); }} className="input-padrao" style={{ borderColor: '#93c5fd', fontSize: '15px', fontWeight: '700' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', display: 'block', marginBottom: '6px' }}>JORNADA (Horas trabalhadas no mês)</label>
              <input type="number" value={custosGlobais.horas_mes} onChange={(e) => setCustosGlobais({...custosGlobais, horas_mes: e.target.value})} onBlur={async () => { await supabase.from('delivery_custos_globais').upsert({ id: 1, faturamento_meta: parseFloat(custosGlobais.faturamento_meta) || 0, horas_mes: parseFloat(custosGlobais.horas_mes) || 0 }); mostrarNotificacao('Metas salvas!'); }} className="input-padrao" style={{ borderColor: '#93c5fd', fontSize: '15px', fontWeight: '700' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '850', color: '#1f2937' }}>Categorias Operacionais</h3>
            <button type="button" onClick={() => { setEdicaoCustoId(null); setFormCusto({ nome: '', valor: '', categoria: 'Nova Categoria', is_percentual: false, novaCategoria: '' }); setModalCustoAberto(true); }} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>＋ Nova Categoria</button>
          </div>

          {todasCategoriasAgrupadas.map(cat => {
            const despesasDessaCat = itensCusto.filter(i => i.categoria === cat);
            const isPerc = despesasDessaCat.some(i => i.is_percentual) || cat.includes('%') || cat.includes('Taxas');
            const somado = despesasDessaCat.reduce((acc, i) => acc + parseFloat(i.valor), 0);

            return (
              <div className="card-app" key={cat} style={{ marginBottom: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div><h4 style={{ margin: 0, fontSize: '16px', color: '#1e3a8a', fontWeight: '800' }}>{cat}</h4><small style={{ color: '#9ca3af', fontWeight: '600' }}>{despesasDessaCat.length} {despesasDessaCat.length === 1 ? 'item' : 'itens'}</small></div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#111827' }}>{isPerc ? `${somado.toFixed(1)}%` : `R$ ${somado.toFixed(2)}`}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {despesasDessaCat.map(it => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>{it.nome}</span>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', color: '#111827', fontSize: '14px' }}>{it.is_percentual ? `${it.valor}%` : `R$ ${it.valor.toFixed(2)}`}</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <button type="button" onClick={() => { setEdicaoCustoId(it.id); setFormCusto({ nome: it.nome, valor: it.valor.toString(), categoria: it.categoria, is_percentual: it.is_percentual, novaCategoria: '' }); setModalCustoAberto(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                          <button type="button" onClick={() => setModalExclusao({ aberto: true, tipo: 'CUSTO', item: it })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setEdicaoCustoId(null); setFormCusto({ nome: '', valor: '', categoria: cat, is_percentual: cat.includes('Taxas'), novaCategoria: '' }); setModalCustoAberto(true); }} style={{ marginTop: '6px', padding: '10px', backgroundColor: '#fff', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>＋ Adicionar custo em {cat}</button>
                </div>
              </div>
            );
          })}

          <div className="card-app" style={{ marginTop: '28px', marginBottom: '16px', padding: '20px', borderLeft: '5px solid #0284c7', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
              <div><h4 style={{ margin: 0, fontSize: '17px', color: '#0369a1', fontWeight: '850' }}>📡 Canais de Venda (Taxas por Plataforma)</h4><small style={{ color: '#64748b', fontWeight: '600' }}>Estas taxas incidem sozinhas por pedido.</small></div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '4px 8px', borderRadius: '6px' }}>100% Percentual (%)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {listaCanaisDeVenda.map(cn => (
                <div key={cn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{cn.nome}</span>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '900', color: '#0284c7', fontSize: '15px' }}>{cn.valor}%</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button type="button" onClick={() => { setEdicaoCustoId(cn.id); setFormCusto({ nome: cn.nome, valor: cn.valor.toString(), categoria: cn.categoria, is_percentual: true, novaCategoria: '' }); setModalCustoAberto(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                      <button type="button" onClick={() => setModalExclusao({ aberto: true, tipo: 'CUSTO', item: cn })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => { setEdicaoCustoId(null); setFormCusto({ nome: '', valor: '', categoria: 'Canais de Venda (Plataformas)', is_percentual: true, novaCategoria: '' }); setModalCustoAberto(true); }} style={{ marginTop: '6px', padding: '12px', backgroundColor: '#e0f2fe', border: '1px dashed #7dd3fc', borderRadius: '8px', color: '#0369a1', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>＋ Adicionar nova Plataforma</button>
            </div>
          </div>

          {modalCustoAberto && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
              <div className="card-app" style={{ width: '100%', maxWidth: '390px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: formCusto.categoria === 'Canais de Venda (Plataformas)' ? '#0284c7' : '#2563eb', fontSize: '18px', fontWeight: '850', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>{edicaoCustoId ? '✏️ Alterar Despesa / Taxa' : formCusto.categoria === 'Canais de Venda (Plataformas)' ? '📡 Cadastrar Canal de Venda' : '💰 Lançar Custo Operacional'}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault(); if (!formCusto.nome || !formCusto.valor) return; setSalvandoCusto(true);
                  const catFinal = formCusto.categoria === 'Nova Categoria' ? formCusto.novaCategoria : formCusto.categoria;
                  const py = { nome: formCusto.nome, valor: parseFloat(formCusto.valor), categoria: catFinal, is_percentual: formCusto.is_percentual };
                  if (edicaoCustoId) await supabase.from('delivery_custos_itens').update(py).eq('id', edicaoCustoId);
                  else await supabase.from('delivery_custos_itens').insert([py]);
                  setModalCustoAberto(false); buscarDadosIniciais(); setSalvandoCusto(false); mostrarNotificacao('Salvo com sucesso!');
                }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>CATEGORIA</label>
                    <select value={formCusto.categoria} onChange={(e) => setFormCusto({...formCusto, categoria: e.target.value, is_percentual: e.target.value === 'Custos de Venda (Taxas)' || e.target.value === 'Canais de Venda (Plataformas)'})} className="select-padrao">
                      {todasCategoriasAgrupadas.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="Canais de Venda (Plataformas)">📡 Canais de Venda (Plataformas)</option>
                      <option value="Nova Categoria"> criar nova categoria operacional...</option>
                    </select>
                  </div>
                  {formCusto.categoria === 'Nova Categoria' && <input type="text" value={formCusto.novaCategoria} onChange={(e) => setFormCusto({...formCusto, novaCategoria: e.target.value})} placeholder="Ex: Despesas de Logística" className="input-padrao" required />}
                  <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>{formCusto.categoria === 'Canais de Venda (Plataformas)' ? 'NOME DO APLICATIVO / SITE' : 'NOME DA DESPESA / TAXA'}</label><input type="text" value={formCusto.nome} onChange={(e) => setFormCusto({...formCusto, nome: e.target.value})} placeholder={formCusto.categoria === 'Canais de Venda (Plataformas)' ? "Ex: Rappi, Uber Eats" : "Ex: Internet, Contador"} className="input-padrao" required /></div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>{formCusto.categoria === 'Canais de Venda (Plataformas)' ? 'TAXA COBRADA (%)' : 'VALOR / PORCENTAGEM'}</label><input type="number" step="0.01" value={formCusto.valor} onChange={(e) => setFormCusto({...formCusto, valor: e.target.value})} placeholder="Ex: 15.5" className="input-padrao" required /></div>
                    <div style={{ width: '125px' }}><label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', display: 'block', marginBottom: '4px' }}>FORMATO</label><select value={formCusto.is_percentual ? 'PERCENTUAL' : 'FIXO'} onChange={(e) => setFormCusto({...formCusto, is_percentual: e.target.value === 'PERCENTUAL'})} disabled={formCusto.categoria === 'Canais de Venda (Plataformas)'} className="select-padrao" style={{ backgroundColor: formCusto.categoria === 'Canais de Venda (Plataformas)' ? '#f1f5f9' : '#fff' }}><option value="FIXO">Fixo (R$)</option><option value="PERCENTUAL">Rateio (%)</option></select></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button type="button" onClick={() => setModalCustoAberto(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#4b5563', fontWeight: '700', cursor: 'pointer' }}>Voltar</button>
                    <button type="submit" disabled={salvandoCusto} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: formCusto.categoria === 'Canais de Venda (Plataformas)' ? '#0284c7' : '#2563eb', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>{salvandoCusto ? 'Gravando...' : 'Confirmar'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* POP-UP DE EXCLUSÃO MESTRE                            */}
      {/* ==================================================== */}
      {modalExclusao.aberto && modalExclusao.item && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', boxSizing: 'border-box' }}>
          <div className="card-app" style={{ width: '100%', maxWidth: '360px', padding: '24px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
            <div style={{ fontSize: '38px', marginBottom: '8px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '18px', fontWeight: '800' }}>Confirmar Exclusão</h3>
            <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '14px', lineHeight: '1.4' }}>Tem certeza que deseja apagar <strong>"{modalExclusao.item.nome}"</strong>?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setModalExclusao({ aberto: false, tipo: '', item: null })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={confirmarExclusaoGeral} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}