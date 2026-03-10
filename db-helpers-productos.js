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
    if (row.score_total != null) return Number(row.score_total);
    if (row.puntuacion_total != null) return Number(row.puntuacion_total);

    const keys = [
      'alineacion_estrategica',
      'viabilidad_tecnica',
      'potencial_mercado',
      'diferenciacion',
      'soporte_proveedor'
    ];

    const values = keys.map((k) => Number(row[k] || 0));
    const total = values.reduce((a, b) => a + b, 0);
    return Math.round((total / (keys.length * 5)) * 100);
  }

  const STATUS_META = {
    recibido: {
      label: 'Recibido',
      estado_publico: 'Solicitud recibida',
      mensaje_publico: 'Producto recibido y pendiente de revisión inicial.'
    },
    info_incompleta: {
      label: 'Info incompleta',
      estado_publico: 'Pendiente de información',
      mensaje_publico: 'Falta información para continuar la evaluación.'
    },
    en_evaluacion: {
      label: 'En evaluación',
      estado_publico: 'En evaluación técnica',
      mensaje_publico: 'El equipo técnico está evaluando el producto.'
    },
    aprobado_reunion: {
      label: 'Aprobado reunión',
      estado_publico: 'Revisión avanzada',
      mensaje_publico: 'El producto pasó a revisión avanzada tras reunión técnica.'
    },
    propuesto_ensayo: {
      label: 'Listo para ensayo',
      estado_publico: 'Seleccionado para ensayo',
      mensaje_publico: 'El producto quedó listo para ensayo.'
    },
    ensayo_campo: {
      label: 'En ensayo',
      estado_publico: 'En ensayo de campo',
      mensaje_publico: 'El producto está en etapa de ensayo.'
    },
    cerrado: {
      label: 'Cerrado',
      estado_publico: 'Proceso finalizado',
      mensaje_publico: 'El proceso del producto fue cerrado.'
    },
    rechazado: {
      label: 'Rechazado',
      estado_publico: 'No seleccionado',
      mensaje_publico: 'El producto no fue seleccionado en esta etapa.'
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
      let query = supabase.from('empresas').select('*').order('nombre', { ascending: true });

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

    async crear(datos) {
      const supabase = requireSupabase();
      return await supabase
        .from('empresas')
        .insert({
          id: datos.id || nowId('emp'),
          nombre: datos.nombre,
          activa: datos.activa !== undefined ? datos.activa : true,
          contacto_principal: datos.contacto_principal || null,
          email: datos.email || null,
          telefono: datos.telefono || null,
          pais: datos.pais || null,
          notas: datos.notas || null
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
          tipo_producto: datos.tipo_producto,
          modo_accion: datos.modo_accion || null,
          cultivos_objetivo: datos.cultivos_objetivo || null,
          problema_objetivo: datos.problema_objetivo || null,
          pais_origen: datos.pais_origen || null,
          registro_rd: datos.registro_rd || null,
          estado,
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
        estado_publico: extras.estado_publico || meta.estado_publico || null,
        mensaje_publico: extras.mensaje_publico || meta.mensaje_publico || null,
        motivo_cierre: extras.motivo_cierre || undefined,
        decision_final: extras.decision_final || undefined
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

    async cerrar(id, decisionFinal, motivoCierre) {
      return await this.cambiarEstado(id, 'cerrado', {
        decision_final: decisionFinal || 'cerrado',
        motivo_cierre: motivoCierre || null
      });
    },

    async rechazar(id, motivo) {
      return await this.cambiarEstado(id, 'rechazado', {
        decision_final: 'rechazado',
        motivo_cierre: motivo || null,
        mensaje_publico: motivo
          ? 'El producto no fue seleccionado en esta etapa.'
          : STATUS_META.rechazado.mensaje_publico
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
          participantes_internos: datos.participantes_internos || null,
          participantes_externos: datos.participantes_externos || null,
          resumen: datos.resumen || null,
          acuerdos: datos.acuerdos || null,
          proximo_paso: datos.proximo_paso || null,
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
          accion,
          detalle: detalle || null,
          realizado_por: realizadoPor || actorName()
        });
    }
  };

  DB.productos_pipeline = {
    async cargarCompleto() {
      const [empresasRes, productosRes, evaluacionesRes] = await Promise.all([
        DB.empresas.listar(),
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
        'Se registró el producto en el pipeline.'
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
          'Se actualizaron las notas internas.'
        );
      }

      return actualizado;
    },

    async registrarEvaluacionConHistorial(datos) {
      const evaluacion = await DB.evaluaciones_producto.crear(datos);
      if (evaluacion.error) return evaluacion;

      const score = normalizeScore(evaluacion.data);

      await DB.historial_producto.registrar(
        datos.producto_id,
        'Evaluación registrada',
        'Se registró evaluación con score ' + (score == null ? 'N/D' : score + '/100')
      );

      return evaluacion;
    },

    async registrarReunionConHistorial(datos) {
      const reunion = await DB.reuniones_producto.crear(datos);
      if (reunion.error) return reunion;

      await DB.historial_producto.registrar(
        datos.producto_id,
        'Reunión registrada',
        'Se agregó reunión del ' + (datos.fecha_reunion || 'sin fecha')
      );

      return reunion;
    },

    async cambiarEstadoConHistorial(productoId, nuevoEstado, extras = {}) {
      const actualizado = await DB.productos_externos.cambiarEstado(productoId, nuevoEstado, extras);
      if (actualizado.error) return actualizado;

      const meta = STATUS_META[nuevoEstado] || { label: nuevoEstado };

      await DB.historial_producto.registrar(
        productoId,
        'Cambio de estado',
        'Estado actualizado a ' + meta.label
      );

      return actualizado;
    },

    async rechazarConHistorial(productoId, motivo) {
      const actualizado = await DB.productos_externos.rechazar(productoId, motivo);
      if (actualizado.error) return actualizado;

      await DB.historial_producto.registrar(
        productoId,
        'Producto rechazado',
        motivo || 'Producto rechazado en la evaluación.'
      );

      return actualizado;
    },

    async cerrarConHistorial(productoId, decisionFinal, motivoCierre) {
      const actualizado = await DB.productos_externos.cerrar(productoId, decisionFinal, motivoCierre);
      if (actualizado.error) return actualizado;

      await DB.historial_producto.registrar(
        productoId,
        'Producto cerrado',
        motivoCierre || 'Se cerró el proceso del producto.'
      );

      return actualizado;
    }
  };

  window.DB = DB;
})();
