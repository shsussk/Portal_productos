(function () {
  if (typeof window === 'undefined') return;

  function requireSupabase() {
    if (!window.supabase) {
      throw new Error('No se encontró el cliente Supabase en window.supabase.');
    }
    return window.supabase;
  }

  function actorName() {
    return (window.SESION && window.SESION.nombre) || 'Sistema';
  }

  function nowId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function cleanObject(obj) {
    const out = {};
    Object.keys(obj || {}).forEach((key) => {
      const value = obj[key];
      if (value !== undefined) out[key] = value;
    });
    return out;
  }

  function normalizeScore(row) {
    if (!row) return null;
    if (row.puntuacion_total != null) return Number(row.puntuacion_total);

    const keys = [
      'coherencia_cientifica',
      'evidencia_previa',
      'relevancia_problemas',
      'riesgo_regulatorio',
      'diferenciacion'
    ];

    const values = keys.map((k) => Number(row[k] || 0));
    const total = values.reduce((a, b) => a + b, 0);
    return Math.round((total / (keys.length * 5)) * 100);
  }

  const STATUS_META = {
    recibido: {
      label: 'Recibido',
      estado_publico: 'Solicitud recibida',
      mensaje_publico: 'Su producto ha sido registrado. Será evaluado próximamente.'
    },
    info_incompleta: {
      label: 'Información incompleta',
      estado_publico: 'Pendiente de información',
      mensaje_publico: 'Falta información para continuar la evaluación.'
    },
    en_evaluacion: {
      label: 'En evaluación',
      estado_publico: 'En evaluación técnica',
      mensaje_publico: 'El equipo técnico está evaluando el producto.'
    },
    aprobado_reunion: {
      label: 'Aprobado para reunión',
      estado_publico: 'Revisión avanzada',
      mensaje_publico: 'El producto pasó a una revisión avanzada.'
    },
    rechazado: {
      label: 'Rechazado',
      estado_publico: 'No seleccionado',
      mensaje_publico: 'El producto no fue seleccionado en esta etapa.'
    },
    propuesto_ensayo: {
      label: 'Propuesto para ensayo',
      estado_publico: 'Seleccionado para ensayo',
      mensaje_publico: 'El producto fue seleccionado para avanzar a ensayo.'
    },
    ensayo_diseño: {
      label: 'Diseño de ensayo',
      estado_publico: 'Diseño de ensayo',
      mensaje_publico: 'El producto está en fase de diseño de ensayo.'
    },
    ensayo_campo: {
      label: 'Ensayo de campo',
      estado_publico: 'En ensayo de campo',
      mensaje_publico: 'El producto está en ensayo de campo.'
    },
    cerrado: {
      label: 'Cerrado',
      estado_publico: 'Proceso finalizado',
      mensaje_publico: 'El proceso del producto ha finalizado.'
    }
  };

  const DB = window.DB || {};

  DB.productosMeta = {
    STATUS_META,
    actorName,
    normalizeScore
  };

  DB.empresas = {
    async listar({ soloActivas = true } = {}) {
      const supabase = requireSupabase();
      let query = supabase
        .from('empresas')
        .select('*')
        .order('nombre', { ascending: true });

      if (soloActivas) {
        query = query.eq('activa', true);
      }

      return await query;
    },

    async obtenerPorId(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();
    },

    async buscarPorNombre(nombre) {
      const supabase = requireSupabase();
      return await supabase
        .from('empresas')
        .select('*')
        .eq('nombre', nombre)
        .single();
    },

    async crear(datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('empresas')
        .insert({
          id: datos.id || nowId('emp'),
          nombre: datos.nombre,
          pais: datos.pais || null,
          contacto_nombre: datos.contacto_nombre || null,
          contacto_email: datos.contacto_email || null,
          contacto_telefono: datos.contacto_telefono || null,
          tipo_productos: datos.tipo_productos || [],
          acuerdo_confidencialidad: datos.acuerdo_confidencialidad === true,
          notas_internas: datos.notas_internas || null,
          activa: datos.activa !== undefined ? datos.activa : true,
          creado_por: datos.creado_por || actorName()
        })
        .select()
        .single();
    },

    async actualizar(id, datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('empresas')
        .update(cleanObject(datos))
        .eq('id', id)
        .select()
        .single();
    },

    async desactivar(id) {
      return await this.actualizar(id, { activa: false });
    }
  };

  DB.productos_externos = {
    async listar() {
      const supabase = requireSupabase();
      return await supabase
        .from('productos_externos')
        .select('*')
        .order('creado_en', { ascending: false });
    },

    async listarPorEmpresa(empresaId) {
      const supabase = requireSupabase();
      return await supabase
        .from('productos_externos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('creado_en', { ascending: false });
    },

    async listarPorEstado(estado) {
      const supabase = requireSupabase();
      return await supabase
        .from('productos_externos')
        .select('*')
        .eq('estado', estado)
        .order('creado_en', { ascending: false });
    },

    async obtenerPorId(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('productos_externos')
        .select('*')
        .eq('id', id)
        .single();
    },

    async crear(datos) {
      const supabase = requireSupabase();
      const estado = datos.estado || 'recibido';
      const meta = STATUS_META[estado] || STATUS_META.recibido;

      return await supabase
        .from('productos_externos')
        .insert({
          id: datos.id || nowId('prod'),
          empresa_id: datos.empresa_id,
          nombre_comercial: datos.nombre_comercial,
          ingrediente_activo: datos.ingrediente_activo || null,
          tipo_producto: datos.tipo_producto || 'otro',
          modo_accion: datos.modo_accion || null,
          cultivos_objetivo: datos.cultivos_objetivo || 'banano',
          problema_objetivo: datos.problema_objetivo,
          pais_origen: datos.pais_origen || null,
          registro_rd: datos.registro_rd || 'no',
          registro_otros: datos.registro_otros || null,
          contacto: datos.contacto || null,
          estado: estado,
          puntuacion_total: datos.puntuacion_total !== undefined ? datos.puntuacion_total : null,
          categoria_evaluacion: datos.categoria_evaluacion || null,
          ensayo_id: datos.ensayo_id || null,
          decision_final: datos.decision_final || null,
          motivo_rechazo: datos.motivo_rechazo || null,
          estado_publico: datos.estado_publico || meta.estado_publico,
          mensaje_publico: datos.mensaje_publico || meta.mensaje_publico,
          notas_internas: datos.notas_internas || null,
          creado_por: datos.creado_por || actorName()
        })
        .select()
        .single();
    },

    async actualizar(id, datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('productos_externos')
        .update(cleanObject(datos))
        .eq('id', id)
        .select()
        .single();
    },

    async cambiarEstado(id, nuevoEstado, extras = {}) {
      const meta = STATUS_META[nuevoEstado] || {};

      return await this.actualizar(id, {
        estado: nuevoEstado,
        estado_publico: extras.estado_publico || meta.estado_publico || undefined,
        mensaje_publico: extras.mensaje_publico || meta.mensaje_publico || undefined,
        decision_final: extras.decision_final || undefined,
        motivo_rechazo: extras.motivo_rechazo || undefined,
        ensayo_id: extras.ensayo_id || undefined,
        puntuacion_total: extras.puntuacion_total !== undefined ? extras.puntuacion_total : undefined,
        categoria_evaluacion: extras.categoria_evaluacion || undefined
      });
    },

    async marcarInfoIncompleta(id, mensajePublico) {
      return await this.cambiarEstado(id, 'info_incompleta', {
        mensaje_publico: mensajePublico || STATUS_META.info_incompleta.mensaje_publico
      });
    },

    async marcarEnEvaluacion(id) {
      return await this.cambiarEstado(id, 'en_evaluacion');
    },

    async aprobarReunion(id) {
      return await this.cambiarEstado(id, 'aprobado_reunion');
    },

    async marcarListoEnsayo(id) {
      return await this.cambiarEstado(id, 'propuesto_ensayo');
    },

    async marcarDisenoEnsayo(id, ensayoId) {
      return await this.cambiarEstado(id, 'ensayo_diseño', {
        ensayo_id: ensayoId || undefined
      });
    },

    async marcarEnsayoCampo(id, ensayoId) {
      return await this.cambiarEstado(id, 'ensayo_campo', {
        ensayo_id: ensayoId || undefined
      });
    },

    async cerrar(id, decisionFinal, motivoRechazo) {
      return await this.cambiarEstado(id, 'cerrado', {
        decision_final: decisionFinal || 'observacion',
        motivo_rechazo: motivoRechazo || null
      });
    },

    async rechazar(id, motivo) {
      return await this.cambiarEstado(id, 'rechazado', {
        decision_final: 'no_adoptar',
        motivo_rechazo: motivo || null,
        mensaje_publico: 'El producto no fue seleccionado en esta etapa.'
      });
    },

    async vincularEnsayo(id, ensayoId) {
      return await this.actualizar(id, {
        ensayo_id: ensayoId
      });
    },

    async actualizarResultadoEvaluacion(id, puntuacionTotal, categoriaEvaluacion) {
      return await this.actualizar(id, {
        puntuacion_total: puntuacionTotal,
        categoria_evaluacion: categoriaEvaluacion
      });
    },

    async eliminar(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('productos_externos')
        .delete()
        .eq('id', id);
    }
  };

  DB.evaluaciones_producto = {
    async listar() {
      const supabase = requireSupabase();
      return await supabase
        .from('evaluaciones_producto')
        .select('*')
        .order('evaluado_en', { ascending: false });
    },

    async listarPorProducto(productoId) {
      const supabase = requireSupabase();
      return await supabase
        .from('evaluaciones_producto')
        .select('*')
        .eq('producto_id', productoId)
        .order('evaluado_en', { ascending: false });
    },

    async obtenerUltimaPorProducto(productoId) {
      const { data, error } = await this.listarPorProducto(productoId);
      if (error) return { data: null, error };
      return { data: data && data.length ? data[0] : null, error: null };
    },

    async crear(datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('evaluaciones_producto')
        .insert({
          id: datos.id || nowId('eval'),
          producto_id: datos.producto_id,
          coherencia_cientifica: Number(datos.coherencia_cientifica || 0),
          evidencia_previa: Number(datos.evidencia_previa || 0),
          relevancia_problemas: Number(datos.relevancia_problemas || 0),
          riesgo_regulatorio: Number(datos.riesgo_regulatorio || 0),
          diferenciacion: Number(datos.diferenciacion || 0),
          comentarios: datos.comentarios || null,
          evaluado_por: datos.evaluado_por || actorName()
        })
        .select()
        .single();
    },

    async actualizar(id, datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('evaluaciones_producto')
        .update(cleanObject(datos))
        .eq('id', id)
        .select()
        .single();
    },

    async eliminar(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('evaluaciones_producto')
        .delete()
        .eq('id', id);
    }
  };

  DB.reuniones_producto = {
    async listarPorProducto(productoId) {
      const supabase = requireSupabase();
      return await supabase
        .from('reuniones_producto')
        .select('*')
        .eq('producto_id', productoId)
        .order('fecha_reunion', { ascending: false });
    },

    async obtenerPorId(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('reuniones_producto')
        .select('*')
        .eq('id', id)
        .single();
    },

    async crear(datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('reuniones_producto')
        .insert({
          id: datos.id || nowId('reu'),
          producto_id: datos.producto_id,
          fecha_reunion: datos.fecha_reunion,
          participantes_internos: datos.participantes_internos || [],
          participantes_empresa: datos.participantes_empresa || [],
          resumen: datos.resumen || null,
          acuerdos: datos.acuerdos || null,
          propone_ensayo: datos.propone_ensayo === true,
          creado_por: datos.creado_por || actorName()
        })
        .select()
        .single();
    },

    async actualizar(id, datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('reuniones_producto')
        .update(cleanObject(datos))
        .eq('id', id)
        .select()
        .single();
    },

    async eliminar(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('reuniones_producto')
        .delete()
        .eq('id', id);
    }
  };

  DB.documentos_producto = {
    async listarPorProducto(productoId) {
      const supabase = requireSupabase();
      return await supabase
        .from('documentos_producto')
        .select('*')
        .eq('producto_id', productoId)
        .order('subido_en', { ascending: false });
    },

    async obtenerPorId(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('documentos_producto')
        .select('*')
        .eq('id', id)
        .single();
    },

    async crear(datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('documentos_producto')
        .insert({
          id: datos.id || nowId('doc'),
          producto_id: datos.producto_id,
          tipo: datos.tipo || 'otro',
          nombre: datos.nombre,
          path: datos.path,
          tamano_kb: datos.tamano_kb || null,
          subido_por: datos.subido_por || actorName()
        })
        .select()
        .single();
    },

    async actualizar(id, datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('documentos_producto')
        .update(cleanObject(datos))
        .eq('id', id)
        .select()
        .single();
    },

    async eliminar(id) {
      const supabase = requireSupabase();
      return await supabase
        .from('documentos_producto')
        .delete()
        .eq('id', id);
    }
  };

  DB.historial_producto = {
    async listarPorProducto(productoId) {
      const supabase = requireSupabase();
      return await supabase
        .from('historial_producto')
        .select('*')
        .eq('producto_id', productoId)
        .order('fecha', { ascending: false });
    },

    async registrar(productoId, accion, detalle, realizadoPor) {
      const supabase = requireSupabase();
      return await supabase
        .from('historial_producto')
        .insert({
          id: nowId('hist'),
          producto_id: productoId,
          accion: accion,
          detalle: detalle || null,
          realizado_por: realizadoPor || actorName()
        })
        .select()
        .single();
    }
  };

  DB.productos_pipeline = {
    async cargarCompleto() {
      const [empresasRes, productosRes, evaluacionesRes] = await Promise.all([
        DB.empresas.listar({ soloActivas: false }),
        DB.productos_externos.listar(),
        DB.evaluaciones_producto.listar()
      ]);

      return {
        empresas: empresasRes.data || [],
        productos: productosRes.data || [],
        evaluaciones: evaluacionesRes.data || [],
        errores: {
          empresas: empresasRes.error || null,
          productos: productosRes.error || null,
          evaluaciones: evaluacionesRes.error || null
        }
      };
    },

    async registrarProductoConHistorial(datos) {
      const creado = await DB.productos_externos.crear(datos);
      if (creado.error) return creado;

      await DB.historial_producto.registrar(
        creado.data.id,
        'Producto registrado',
        'Se registró el producto en el pipeline.',
        datos.creado_por || actorName()
      );

      return creado;
    },

    async guardarNotas(productoId, notas) {
      const actualizado = await DB.productos_externos.actualizar(productoId, {
        notas_internas: notas || null
      });

      if (!actualizado.error) {
        await DB.historial_producto.registrar(
          productoId,
          'Notas actualizadas',
          'Se actualizaron las notas internas.',
          actorName()
        );
      }

      return actualizado;
    },

    async registrarEvaluacionConHistorial(datos) {
      const evaluacion = await DB.evaluaciones_producto.crear(datos);
      if (evaluacion.error) return evaluacion;

      const score = normalizeScore(evaluacion.data);
      const categoria = evaluacion.data && evaluacion.data.categoria ? evaluacion.data.categoria : null;

      await DB.productos_externos.actualizar(datos.producto_id, {
        puntuacion_total: score,
        categoria_evaluacion: categoria
      });

      await DB.historial_producto.registrar(
        datos.producto_id,
        'Evaluación registrada',
        'Se registró evaluación con score ' + (score == null ? 'N/D' : score + '/100'),
        datos.evaluado_por || actorName()
      );

      return evaluacion;
    },

    async registrarReunionConHistorial(datos) {
      const reunion = await DB.reuniones_producto.crear(datos);
      if (reunion.error) return reunion;

      await DB.historial_producto.registrar(
        datos.producto_id,
        'Reunión registrada',
        'Se agregó reunión del ' + (datos.fecha_reunion || 'sin fecha'),
        datos.creado_por || actorName()
      );

      if (datos.propone_ensayo === true) {
        await DB.productos_externos.cambiarEstado(datos.producto_id, 'propuesto_ensayo');
      }

      return reunion;
    },

    async registrarDocumentoConHistorial(datos) {
      const documento = await DB.documentos_producto.crear(datos);
      if (documento.error) return documento;

      await DB.historial_producto.registrar(
        datos.producto_id,
        'Documento registrado',
        'Se agregó el documento "' + (datos.nombre || 'sin nombre') + '".',
        datos.subido_por || actorName()
      );

      return documento;
    },

    async cambiarEstadoConHistorial(productoId, nuevoEstado, extras = {}) {
      const actualizado = await DB.productos_externos.cambiarEstado(productoId, nuevoEstado, extras);
      if (actualizado.error) return actualizado;

      const meta = STATUS_META[nuevoEstado] || { label: nuevoEstado };

      await DB.historial_producto.registrar(
        productoId,
        'Cambio de estado',
        'Estado actualizado a ' + meta.label,
        actorName()
      );

      return actualizado;
    },

    async rechazarConHistorial(productoId, motivo) {
      const actualizado = await DB.productos_externos.rechazar(productoId, motivo);
      if (actualizado.error) return actualizado;

      await DB.historial_producto.registrar(
        productoId,
        'Producto rechazado',
        motivo || 'Producto rechazado en la evaluación.',
        actorName()
      );

      return actualizado;
    },

    async cerrarConHistorial(productoId, decisionFinal, motivoRechazo) {
      const actualizado = await DB.productos_externos.cerrar(productoId, decisionFinal, motivoRechazo);
      if (actualizado.error) return actualizado;

      await DB.historial_producto.registrar(
        productoId,
        'Producto cerrado',
        motivoRechazo || 'Se cerró el proceso del producto.',
        actorName()
      );

      return actualizado;
    },

    async vincularEnsayoConHistorial(productoId, ensayoId) {
      const actualizado = await DB.productos_externos.vincularEnsayo(productoId, ensayoId);
      if (actualizado.error) return actualizado;

      await DB.historial_producto.registrar(
        productoId,
        'Ensayo vinculado',
        'Se vinculó el ensayo ' + ensayoId + ' al producto.',
        actorName()
      );

      return actualizado;
    }
  };

  window.DB = DB;
})();
