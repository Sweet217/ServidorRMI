const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Archivos JSON
const USERS_FILE = path.join(__dirname, 'users.json');
const NODOS_FILE = path.join(__dirname, 'nodos.json');
const ARCHIVOS_FILE = path.join(__dirname, 'archivos.json');
const LOGS_FILE = path.join(__dirname, 'logs.json');

// ==================== CLASES DEL SISTEMA ====================

// Clase Usuario - Representa un usuario del sistema
class Usuario {
  constructor(id, nombre, apellido, email, password, rol = 'user') {
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.email = email;
    this.passwordHash = this.hashPassword(password);
    this.rol = rol;
    this.token = null;
    this.ultimoAcceso = new Date();
    this.ipUltimaSesion = null;
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  verificarPassword(password) {
    return this.hashPassword(password) === this.passwordHash;
  }

  generarToken() {
    this.token = crypto.randomBytes(32).toString('hex');
    this.ultimoAcceso = new Date();
    return this.token;
  }

  verificarToken(token) {
    return this.token === token;
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      apellido: this.apellido,
      email: this.email,
      rol: this.rol,
      ultimoAcceso: this.ultimoAcceso,
      ipUltimaSesion: this.ipUltimaSesion
    };
  }
}

// Clase Archivo - Representa archivos en el sistema distribuido
class Archivo {
  constructor(id, nombre, contenido, propietarioId, nodoId) {
    this.id = id;
    this.nombre = nombre;
    this.contenido = contenido;
    this.propietarioId = propietarioId;
    this.nodoId = nodoId;
    this.version = 1;
    this.replicas = [];
    this.bloqueado = false;
    this.bloqueadoPor = null;
    this.fechaCreacion = new Date();
    this.fechaModificacion = new Date();
    this.checksum = this.calcularChecksum();
  }

  calcularChecksum() {
    return crypto.createHash('md5').update(this.contenido).digest('hex');
  }

  bloquear(usuarioId) {
    if (this.bloqueado) {
      throw new Error(`Archivo bloqueado por usuario ${this.bloqueadoPor}`);
    }
    this.bloqueado = true;
    this.bloqueadoPor = usuarioId;
  }

  desbloquear(usuarioId) {
    if (this.bloqueadoPor !== usuarioId) {
      throw new Error('No tienes permiso para desbloquear este archivo');
    }
    this.bloqueado = false;
    this.bloqueadoPor = null;
  }

  actualizar(contenido, usuarioId) {
    if (this.bloqueado && this.bloqueadoPor !== usuarioId) {
      throw new Error('Archivo bloqueado por otro usuario');
    }
    this.contenido = contenido;
    this.version++;
    this.fechaModificacion = new Date();
    this.checksum = this.calcularChecksum();
  }

  agregarReplica(nodoId) {
    if (!this.replicas.includes(nodoId)) {
      this.replicas.push(nodoId);
    }
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      contenido: this.contenido,
      propietarioId: this.propietarioId,
      nodoId: this.nodoId,
      version: this.version,
      replicas: this.replicas,
      bloqueado: this.bloqueado,
      bloqueadoPor: this.bloqueadoPor,
      fechaCreacion: this.fechaCreacion,
      fechaModificacion: this.fechaModificacion,
      checksum: this.checksum
    };
  }
}

// Clase Auditor - Registra todas las operaciones del sistema
class Auditor {
  constructor() {
    this.logs = [];
    this.logsPorNodo = new Map();
    this.cargarLogs();
  }

  cargarLogs() {
    try {
      if (fs.existsSync(LOGS_FILE)) {
        const data = fs.readFileSync(LOGS_FILE, 'utf8');
        this.logs = JSON.parse(data);
        console.log(`✅ Cargados ${this.logs.length} logs desde ${LOGS_FILE}`);
      }
    } catch (error) {
      console.error('❌ Error al cargar logs:', error);
      this.logs = [];
    }
  }

  guardarLogs() {
    try {
      fs.writeFileSync(LOGS_FILE, JSON.stringify(this.logs, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Error al guardar logs:', error);
    }
  }

  registrar(evento, usuarioId, recurso, nodoId, resultado, detalles = {}) {
    const log = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date(),
      evento,
      usuarioId,
      recurso,
      nodoId,
      resultado,
      detalles,
      checksum: this.generarChecksum(evento, usuarioId, recurso, nodoId)
    };

    this.logs.push(log);
    
    if (!this.logsPorNodo.has(nodoId)) {
      this.logsPorNodo.set(nodoId, []);
    }
    this.logsPorNodo.get(nodoId).push(log);

    // Mantener solo últimos 1000 logs
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    // Guardar logs cada 10 registros
    if (this.logs.length % 10 === 0) {
      this.guardarLogs();
    }

    return log;
  }

  generarChecksum(evento, usuarioId, recurso, nodoId) {
    const data = `${evento}${usuarioId}${recurso}${nodoId}${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  obtenerLogs(filtros = {}) {
    let logsFiltrados = [...this.logs];

    if (filtros.usuarioId) {
      logsFiltrados = logsFiltrados.filter(log => log.usuarioId === filtros.usuarioId);
    }

    if (filtros.nodoId) {
      logsFiltrados = logsFiltrados.filter(log => log.nodoId === filtros.nodoId);
    }

    if (filtros.evento) {
      logsFiltrados = logsFiltrados.filter(log => log.evento === filtros.evento);
    }

    return logsFiltrados.slice(-100); // Últimos 100 logs
  }

  detectarInconsistencias() {
    const inconsistencias = [];
    const checksumVistos = new Set();

    for (const log of this.logs) {
      if (checksumVistos.has(log.checksum)) {
        inconsistencias.push({
          tipo: 'LOG_DUPLICADO',
          logId: log.id,
          detalles: 'Log duplicado detectado'
        });
      }
      checksumVistos.add(log.checksum);
    }

    return inconsistencias;
  }
}

// Clase Nodo - Representa un servidor en el sistema distribuido
class Nodo {
  constructor(id, nombre, capacidad = 100) {
    this.id = id;
    this.nombre = nombre;
    this.estado = 'ACTIVO'; // ACTIVO, DEGRADADO, INACTIVO
    this.capacidad = capacidad;
    this.cargaActual = 0;
    this.latencia = Math.random() * 50; // ms
    this.archivos = [];
    this.ultimoHeartbeat = new Date();
    this.fallos = 0;
    this.replicaDe = []; // Archivos de los que este nodo es réplica
  }

  agregarArchivo(archivoId) {
    if (!this.archivos.includes(archivoId)) {
      this.archivos.push(archivoId);
      this.cargaActual++;
    }
  }

  removerArchivo(archivoId) {
    const index = this.archivos.indexOf(archivoId);
    if (index > -1) {
      this.archivos.splice(index, 1);
      this.cargaActual--;
    }
  }

  obtenerCarga() {
    return (this.cargaActual / this.capacidad) * 100;
  }

  estaDisponible() {
    return this.estado === 'ACTIVO' && this.obtenerCarga() < 90;
  }

  simularFallo() {
    this.estado = 'INACTIVO';
    this.fallos++;
  }

  recuperar() {
    this.estado = 'ACTIVO';
    this.ultimoHeartbeat = new Date();
  }

  actualizarHeartbeat() {
    this.ultimoHeartbeat = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      estado: this.estado,
      capacidad: this.capacidad,
      cargaActual: this.cargaActual,
      cargaPorcentaje: this.obtenerCarga().toFixed(2),
      latencia: this.latencia.toFixed(2),
      archivos: this.archivos.length,
      ultimoHeartbeat: this.ultimoHeartbeat,
      fallos: this.fallos
    };
  }
}

// Clase ControladorSeguridad - Maneja autenticación y autorización
class ControladorSeguridad {
  constructor() {
    this.sesionesActivas = new Map();
    this.intentosFallidos = new Map();
    this.ipsSospechosas = new Set();
    this.rateLimits = new Map();
  }

  autenticar(usuario, password, ip) {
    // Verificar rate limiting
    if (this.verificarRateLimit(ip)) {
      throw new Error('Demasiados intentos. Intente más tarde');
    }

    // Verificar IP sospechosa
    if (this.ipsSospechosas.has(ip)) {
      throw new Error('IP bloqueada por actividad sospechosa');
    }

    if (!usuario.verificarPassword(password)) {
      this.registrarIntentoFallido(ip);
      throw new Error('Credenciales inválidas');
    }

    // Detectar acceso desde nueva IP
    if (usuario.ipUltimaSesion && usuario.ipUltimaSesion !== ip) {
      console.log(`⚠️  Alerta: Usuario ${usuario.nombre} accediendo desde nueva IP: ${ip}`);
    }

    const token = usuario.generarToken();
    usuario.ipUltimaSesion = ip;
    
    this.sesionesActivas.set(token, {
      usuarioId: usuario.id,
      ip,
      inicioSesion: new Date()
    });

    this.limpiarIntentosFallidos(ip);

    return token;
  }

  verificarRateLimit(ip) {
    const ahora = Date.now();
    const limite = this.rateLimits.get(ip) || { intentos: 0, timestamp: ahora };

    // Reset cada minuto
    if (ahora - limite.timestamp > 60000) {
      this.rateLimits.set(ip, { intentos: 1, timestamp: ahora });
      return false;
    }

    limite.intentos++;
    this.rateLimits.set(ip, limite);

    return limite.intentos > 10;
  }

  registrarIntentoFallido(ip) {
    const intentos = this.intentosFallidos.get(ip) || 0;
    this.intentosFallidos.set(ip, intentos + 1);

    if (intentos + 1 >= 5) {
      this.ipsSospechosas.add(ip);
    }
  }

  limpiarIntentosFallidos(ip) {
    this.intentosFallidos.delete(ip);
  }

  validarToken(token) {
    const sesion = this.sesionesActivas.get(token);
    if (!sesion) {
      throw new Error('Token inválido o expirado');
    }

    // Verificar expiración (24 horas)
    const ahora = Date.now();
    if (ahora - sesion.inicioSesion.getTime() > 24 * 60 * 60 * 1000) {
      this.sesionesActivas.delete(token);
      throw new Error('Sesión expirada');
    }

    return sesion;
  }

  cerrarSesion(token) {
    this.sesionesActivas.delete(token);
  }

  cifrarComunicacion(data) {
    const cipher = crypto.createCipher('aes-256-cbc', 'clave-secreta-sistema');
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  descifrarComunicacion(encrypted) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', 'clave-secreta-sistema');
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (e) {
      throw new Error('Error al descifrar comunicación');
    }
  }
}

// Clase BalanceadorCarga - Distribuye peticiones entre nodos
class BalanceadorCarga {
  constructor() {
    this.algoritmo = 'ROUND_ROBIN'; // ROUND_ROBIN, LEAST_CONNECTIONS, WEIGHTED
    this.indiceActual = 0;
  }

  seleccionarNodo(nodos) {
    const nodosDisponibles = nodos.filter(n => n.estaDisponible());

    if (nodosDisponibles.length === 0) {
      throw new Error('No hay nodos disponibles');
    }

    let nodoSeleccionado;

    switch (this.algoritmo) {
      case 'ROUND_ROBIN':
        nodoSeleccionado = nodosDisponibles[this.indiceActual % nodosDisponibles.length];
        this.indiceActual++;
        break;

      case 'LEAST_CONNECTIONS':
        nodoSeleccionado = nodosDisponibles.reduce((min, nodo) => 
          nodo.obtenerCarga() < min.obtenerCarga() ? nodo : min
        );
        break;

      case 'WEIGHTED':
        nodoSeleccionado = nodosDisponibles.reduce((mejor, nodo) => {
          const scoreNodo = (100 - nodo.obtenerCarga()) / (nodo.latencia + 1);
          const scoreMejor = (100 - mejor.obtenerCarga()) / (mejor.latencia + 1);
          return scoreNodo > scoreMejor ? nodo : mejor;
        });
        break;

      default:
        nodoSeleccionado = nodosDisponibles[0];
    }

    return nodoSeleccionado;
  }

  cambiarAlgoritmo(nuevoAlgoritmo) {
    this.algoritmo = nuevoAlgoritmo;
  }
}

// ==================== SISTEMA PRINCIPAL ====================

class SistemaDistribuido {
  constructor() {
    this.usuarios = new Map();
    this.archivos = new Map();
    this.nodos = new Map();
    this.auditor = new Auditor();
    this.controladorSeguridad = new ControladorSeguridad();
    this.balanceadorCarga = new BalanceadorCarga();
    
    this.cargarUsuariosDesdeArchivo();
    this.cargarNodosDesdeArchivo();
    this.cargarArchivosDesdeArchivo();
    this.inicializarSistema();
  }

  // ========== USUARIOS ==========
  cargarUsuariosDesdeArchivo() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        const usuariosData = JSON.parse(data);
        
        usuariosData.forEach(userData => {
          const usuario = new Usuario(
            userData.id,
            userData.nombre,
            userData.apellido,
            userData.email,
            userData.password,
            userData.rol
          );
          this.usuarios.set(usuario.id, usuario);
        });
        
        console.log(`✅ Cargados ${this.usuarios.size} usuarios desde ${USERS_FILE}`);
      } else {
        console.log('⚠️  users.json no encontrado, creando usuarios por defecto...');
        this.crearUsuariosPorDefecto();
      }
    } catch (error) {
      console.error('❌ Error al cargar usuarios:', error);
      this.crearUsuariosPorDefecto();
    }
  }

  crearUsuariosPorDefecto() {
    const usuariosDefault = [
      {
        id: 'admin',
        nombre: 'Carlos',
        apellido: 'Administrador',
        email: 'admin@sistema.com',
        password: 'admin123',
        rol: 'admin'
      },
      {
        id: 'user1',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan.perez@empresa.com',
        password: 'demo123',
        rol: 'user'
      }
    ];

    usuariosDefault.forEach(userData => {
      const usuario = new Usuario(
        userData.id,
        userData.nombre,
        userData.apellido,
        userData.email,
        userData.password,
        userData.rol
      );
      this.usuarios.set(usuario.id, usuario);
    });

    this.guardarUsuariosEnArchivo();
  }

  guardarUsuariosEnArchivo() {
    try {
      const usuariosData = Array.from(this.usuarios.values()).map(u => ({
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        password: 'stored_as_hash',
        rol: u.rol
      }));

      fs.writeFileSync(USERS_FILE, JSON.stringify(usuariosData, null, 2), 'utf8');
      console.log('💾 Usuarios guardados en users.json');
    } catch (error) {
      console.error('❌ Error al guardar usuarios:', error);
    }
  }

  // ========== NODOS ==========
  cargarNodosDesdeArchivo() {
    try {
      if (fs.existsSync(NODOS_FILE)) {
        const data = fs.readFileSync(NODOS_FILE, 'utf8');
        const nodosData = JSON.parse(data);
        
        nodosData.forEach(nodoData => {
          const nodo = new Nodo(nodoData.id, nodoData.nombre, nodoData.capacidad);
          nodo.estado = nodoData.estado || 'ACTIVO';
          nodo.cargaActual = nodoData.cargaActual || 0;
          nodo.archivos = nodoData.archivos || [];
          nodo.fallos = nodoData.fallos || 0;
          this.nodos.set(nodo.id, nodo);
        });
        
        console.log(`✅ Cargados ${this.nodos.size} nodos desde ${NODOS_FILE}`);
      } else {
        console.log('⚠️  nodos.json no encontrado, creando nodos por defecto...');
        this.crearNodosPorDefecto();
      }
    } catch (error) {
      console.error('❌ Error al cargar nodos:', error);
      this.crearNodosPorDefecto();
    }
  }

  crearNodosPorDefecto() {
    for (let i = 1; i <= 5; i++) {
      const nodo = new Nodo(`nodo${i}`, `Servidor ${i}`, 100);
      this.nodos.set(nodo.id, nodo);
    }
    this.guardarNodosEnArchivo();
  }

  guardarNodosEnArchivo() {
    try {
      const nodosData = Array.from(this.nodos.values()).map(n => ({
        id: n.id,
        nombre: n.nombre,
        estado: n.estado,
        capacidad: n.capacidad,
        cargaActual: n.cargaActual,
        archivos: n.archivos,
        fallos: n.fallos
      }));

      fs.writeFileSync(NODOS_FILE, JSON.stringify(nodosData, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Error al guardar nodos:', error);
    }
  }

  // ========== ARCHIVOS ==========
  cargarArchivosDesdeArchivo() {
    try {
      if (fs.existsSync(ARCHIVOS_FILE)) {
        const data = fs.readFileSync(ARCHIVOS_FILE, 'utf8');
        const archivosData = JSON.parse(data);
        
        archivosData.forEach(archivoData => {
          const archivo = new Archivo(
            archivoData.id,
            archivoData.nombre,
            archivoData.contenido,
            archivoData.propietarioId,
            archivoData.nodoId
          );
          archivo.version = archivoData.version || 1;
          archivo.replicas = archivoData.replicas || [];
          archivo.fechaCreacion = new Date(archivoData.fechaCreacion);
          archivo.fechaModificacion = new Date(archivoData.fechaModificacion);
          this.archivos.set(archivo.id, archivo);
        });
        
        console.log(`✅ Cargados ${this.archivos.size} archivos desde ${ARCHIVOS_FILE}`);
      } else {
        console.log('⚠️  archivos.json no encontrado, creando archivo por defecto...');
        this.crearArchivosPorDefecto();
      }
    } catch (error) {
      console.error('❌ Error al cargar archivos:', error);
      this.crearArchivosPorDefecto();
    }
  }

  crearArchivosPorDefecto() {
    const archivo = new Archivo(
      'file1',
      'ejemplo.txt',
      'Contenido de ejemplo del sistema distribuido',
      'admin',
      'nodo1'
    );
    this.archivos.set(archivo.id, archivo);
    
    if (this.nodos.has('nodo1')) {
      this.nodos.get('nodo1').agregarArchivo(archivo.id);
    }
    
    if (this.nodos.has('nodo2')) {
      archivo.agregarReplica('nodo2');
      this.nodos.get('nodo2').agregarArchivo(archivo.id);
    }
    
    this.guardarArchivosEnArchivo();
  }

  guardarArchivosEnArchivo() {
    try {
      const archivosData = Array.from(this.archivos.values()).map(a => ({
        id: a.id,
        nombre: a.nombre,
        contenido: a.contenido,
        propietarioId: a.propietarioId,
        nodoId: a.nodoId,
        version: a.version,
        replicas: a.replicas,
        bloqueado: a.bloqueado,
        bloqueadoPor: a.bloqueadoPor,
        fechaCreacion: a.fechaCreacion,
        fechaModificacion: a.fechaModificacion,
        checksum: a.checksum
      }));

      fs.writeFileSync(ARCHIVOS_FILE, JSON.stringify(archivosData, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Error al guardar archivos:', error);
    }
  }

  inicializarSistema() {
    this.auditor.registrar('SISTEMA_INICIALIZADO', 'system', 'sistema', 'nodo1', 'EXITOSO');
    console.log('🚀 Sistema Distribuido inicializado correctamente\n');
  }

  autenticarUsuario(nombreOEmail, password, ip) {
    const usuario = Array.from(this.usuarios.values()).find(
      u => u.nombre === nombreOEmail || u.email === nombreOEmail
    );
    
    if (!usuario) {
      this.auditor.registrar('LOGIN_FALLIDO', nombreOEmail, 'auth', 'nodo1', 'FALLIDO', { motivo: 'Usuario no existe' });
      throw new Error('Usuario no encontrado');
    }

    try {
      const token = this.controladorSeguridad.autenticar(usuario, password, ip);
      this.auditor.registrar('LOGIN_EXITOSO', usuario.id, 'auth', 'nodo1', 'EXITOSO', { ip });
      return { usuario: usuario.toJSON(), token };
    } catch (error) {
      this.auditor.registrar('LOGIN_FALLIDO', usuario.id, 'auth', 'nodo1', 'FALLIDO', { error: error.message, ip });
      throw error;
    }
  }

  validarSesion(token) {
    const sesion = this.controladorSeguridad.validarToken(token);
    return this.usuarios.get(sesion.usuarioId);
  }

  crearArchivo(nombre, contenido, usuarioId, token) {
    const usuario = this.validarSesion(token);
    
    if (usuario.id !== usuarioId) {
      throw new Error('No autorizado');
    }

    const nodo = this.balanceadorCarga.seleccionarNodo(Array.from(this.nodos.values()));
    const archivoId = `file_${Date.now()}`;
    
    const archivo = new Archivo(archivoId, nombre, contenido, usuarioId, nodo.id);
    this.archivos.set(archivoId, archivo);
    nodo.agregarArchivo(archivoId);

    // Replicar en otro nodo
    const nodoReplica = this.seleccionarNodoReplica(nodo.id);
    if (nodoReplica) {
      archivo.agregarReplica(nodoReplica.id);
      nodoReplica.agregarArchivo(archivoId);
    }

    this.auditor.registrar('ARCHIVO_CREADO', usuarioId, archivoId, nodo.id, 'EXITOSO', { nombre });
    this.guardarArchivosEnArchivo();
    this.guardarNodosEnArchivo();
    
    return archivo.toJSON();
  }

  seleccionarNodoReplica(nodoOriginalId) {
    const nodosDisponibles = Array.from(this.nodos.values())
      .filter(n => n.id !== nodoOriginalId && n.estaDisponible());
    
    if (nodosDisponibles.length === 0) return null;
    
    return nodosDisponibles.reduce((min, nodo) => 
      nodo.obtenerCarga() < min.obtenerCarga() ? nodo : min
    );
  }

  modificarArchivo(archivoId, contenido, usuarioId, token) {
    const usuario = this.validarSesion(token);
    const archivo = this.archivos.get(archivoId);

    if (!archivo) {
      throw new Error('Archivo no encontrado');
    }

    if (archivo.propietarioId !== usuarioId && usuario.rol !== 'admin') {
      this.auditor.registrar('ACCESO_NO_AUTORIZADO', usuarioId, archivoId, archivo.nodoId, 'FALLIDO');
      throw new Error('No tienes permiso para modificar este archivo');
    }

    try {
      archivo.bloquear(usuarioId);
      archivo.actualizar(contenido, usuarioId);
      
      this.sincronizarReplicas(archivo);
      
      archivo.desbloquear(usuarioId);

      this.auditor.registrar('ARCHIVO_MODIFICADO', usuarioId, archivoId, archivo.nodoId, 'EXITOSO', { version: archivo.version });
      this.guardarArchivosEnArchivo();
      
      return archivo.toJSON();
    } catch (error) {
      this.auditor.registrar('ARCHIVO_MODIFICADO', usuarioId, archivoId, archivo.nodoId, 'FALLIDO', { error: error.message });
      throw error;
    }
  }

  sincronizarReplicas(archivo) {
    for (const nodoReplicaId of archivo.replicas) {
      const nodoReplica = this.nodos.get(nodoReplicaId);
      if (nodoReplica && nodoReplica.estado === 'ACTIVO') {
        this.auditor.registrar('REPLICA_SINCRONIZADA', 'system', archivo.id, nodoReplicaId, 'EXITOSO');
      }
    }
  }

  simularFalloNodo(nodoId) {
    const nodo = this.nodos.get(nodoId);
    if (!nodo) throw new Error('Nodo no encontrado');

    nodo.simularFallo();
    this.auditor.registrar('NODO_FALLO', 'system', nodoId, nodoId, 'FALLO');

    this.recuperarArchivosNodo(nodoId);
    this.guardarNodosEnArchivo();

    return nodo.toJSON();
  }

  recuperarArchivosNodo(nodoId) {
    const archivosAfectados = Array.from(this.archivos.values())
      .filter(a => a.nodoId === nodoId);

    for (const archivo of archivosAfectados) {
      for (const replicaId of archivo.replicas) {
        const nodoReplica = this.nodos.get(replicaId);
        if (nodoReplica && nodoReplica.estado === 'ACTIVO') {
          archivo.nodoId = replicaId;
          this.auditor.registrar('ARCHIVO_RECUPERADO', 'system', archivo.id, replicaId, 'EXITOSO', { nodoOriginal: nodoId });
          break;
        }
      }
    }
    this.guardarArchivosEnArchivo();
  }

  recuperarNodo(nodoId) {
    const nodo = this.nodos.get(nodoId);
    if (!nodo) throw new Error('Nodo no encontrado');

    nodo.recuperar();
    this.auditor.registrar('NODO_RECUPERADO', 'system', nodoId, nodoId, 'EXITOSO');
    this.guardarNodosEnArchivo();

    return nodo.toJSON();
  }

  agregarNodo(nombre, capacidad) {
    const nodoId = `nodo${this.nodos.size + 1}`;
    const nodo = new Nodo(nodoId, nombre, capacidad);
    this.nodos.set(nodoId, nodo);

    this.auditor.registrar('NODO_AGREGADO', 'system', nodoId, nodoId, 'EXITOSO');
    this.guardarNodosEnArchivo();

    return nodo.toJSON();
  }

  obtenerEstadoSistema() {
    return {
      nodos: Array.from(this.nodos.values()).map(n => n.toJSON()),
      archivos: Array.from(this.archivos.values()).map(a => a.toJSON()),
      usuarios: Array.from(this.usuarios.values()).map(u => u.toJSON()),
      logs: this.auditor.obtenerLogs(),
      inconsistencias: this.auditor.detectarInconsistencias(),
      estadisticas: {
        totalNodos: this.nodos.size,
        nodosActivos: Array.from(this.nodos.values()).filter(n => n.estado === 'ACTIVO').length,
        totalArchivos: this.archivos.size,
        totalUsuarios: this.usuarios.size,
        sesionesActivas: this.controladorSeguridad.sesionesActivas.size
      }
    };
  }
}

// ==================== API REST ====================

const sistema = new SistemaDistribuido();

app.post('/api/login', (req, res) => {
  try {
    const { usuario, password } = req.body;
    const ip = req.ip || '127.0.0.1';
    const resultado = sistema.autenticarUsuario(usuario, password, ip);
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  try {
    const { token } = req.body;
    sistema.controladorSeguridad.cerrarSesion(token);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/estado', (req, res) => {
  try {
    const estado = sistema.obtenerEstadoSistema();
    res.json({ success: true, data: estado });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/archivo', (req, res) => {
  try {
    const { nombre, contenido, usuarioId, token } = req.body;
    const archivo = sistema.crearArchivo(nombre, contenido, usuarioId, token);
    res.json({ success: true, data: archivo });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/archivo/:id', (req, res) => {
  try {
    const { contenido, usuarioId, token } = req.body;
    const archivo = sistema.modificarArchivo(req.params.id, contenido, usuarioId, token);
    res.json({ success: true, data: archivo });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/nodo/fallo/:id', (req, res) => {
  try {
    const nodo = sistema.simularFalloNodo(req.params.id);
    res.json({ success: true, data: nodo });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/nodo/recuperar/:id', (req, res) => {
  try {
    const nodo = sistema.recuperarNodo(req.params.id);
    res.json({ success: true, data: nodo });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/nodo', (req, res) => {
  try {
    const { nombre, capacidad } = req.body;
    const nodo = sistema.agregarNodo(nombre, capacidad || 100);
    res.json({ success: true, data: nodo });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Guardar datos antes de cerrar el servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  sistema.guardarUsuariosEnArchivo();
  sistema.guardarNodosEnArchivo();
  sistema.guardarArchivosEnArchivo();
  sistema.auditor.guardarLogs();
  console.log('💾 Datos guardados correctamente');
  process.exit(0);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 SISTEMA DISTRIBUIDO - SERVIDOR BACKEND');
  console.log('='.repeat(60));
  console.log(`📡 Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log(`📁 Archivos de datos:`);
  console.log(`   - users.json: ${sistema.usuarios.size} usuarios`);
  console.log(`   - nodos.json: ${sistema.nodos.size} nodos`);
  console.log(`   - archivos.json: ${sistema.archivos.size} archivos`);
  console.log(`   - logs.json: ${sistema.auditor.logs.length} registros`);
  console.log('='.repeat(60));
  console.log('👤 Usuarios disponibles:');
  Array.from(sistema.usuarios.values()).forEach(u => {
    console.log(`   - ${u.email} (${u.rol})`);
  });
  console.log('='.repeat(60));
  console.log('✨ Sistema listo para recibir peticiones\n');
});