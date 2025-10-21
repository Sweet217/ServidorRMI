<template>
  <div>
    <!-- Pantalla de Login -->
    <div v-if="vista === 'login'" class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-800">Sistema Distribuido</h1>
          <p class="text-gray-600 mt-2">Gestión de Usuarios, Archivos y Auditoría</p>
        </div>

        <form @submit.prevent="login" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email o Usuario</label>
            <input
              v-model="loginForm.usuario"
              type="text"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@sistema.com"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              v-model="loginForm.password"
              type="password"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
          </button>
        </form>

        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-blue-800 font-semibold mb-2">Usuarios de prueba:</p>
          <p class="text-xs text-blue-700">Admin: admin@sistema.com / admin123</p>
          <p class="text-xs text-blue-700">Usuario: juan.perez@empresa.com / demo123</p>
        </div>
      </div>

      <div v-if="mensaje" :class="['fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white font-semibold', getMensajeClass()]">
        {{ mensaje.texto }}
      </div>
    </div>

    <!-- Dashboard Principal -->
    <div v-else class="min-h-screen bg-gray-100">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-800">Sistema Distribuido</h1>
              <p class="text-sm text-gray-600">Bienvenido, {{ sesion?.usuario.nombre }} {{ sesion?.usuario.apellido }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-600 px-3 py-1 bg-blue-100 rounded-full">
              {{ sesion?.usuario.rol === 'admin' ? '👑 Admin' : '👤 Usuario' }}
            </span>
            <button
              @click="logout"
              class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <!-- Navegación -->
      <nav class="bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex gap-1">
            <button
              v-for="v in ['dashboard', 'nodos', 'archivos', 'auditoria']"
              :key="v"
              @click="vista = v"
              :class="['px-6 py-3 font-semibold transition capitalize', vista === v ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800']"
            >
              {{ v }}
            </button>
          </div>
        </div>
      </nav>

      <!-- Mensajes -->
      <div v-if="mensaje" class="max-w-7xl mx-auto px-4 mt-4">
        <div :class="['px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 text-white font-semibold', getMensajeClass()]">
          {{ mensaje.texto }}
        </div>
      </div>

      <!-- Contenido Principal -->
      <main class="max-w-7xl mx-auto px-4 py-6">
        <!-- Vista Dashboard -->
        <div v-if="vista === 'dashboard' && estado" class="space-y-6">
          <!-- Estadísticas -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Nodos Activos</p>
                  <p class="text-3xl font-bold text-green-600 mt-1">
                    {{ estado.estadisticas.nodosActivos }}/{{ estado.estadisticas.totalNodos }}
                  </p>
                </div>
                <svg class="w-12 h-12 text-green-500 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Archivos</p>
                  <p class="text-3xl font-bold text-blue-600 mt-1">{{ estado.estadisticas.totalArchivos }}</p>
                </div>
                <svg class="w-12 h-12 text-blue-500 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Usuarios</p>
                  <p class="text-3xl font-bold text-purple-600 mt-1">{{ estado.estadisticas.totalUsuarios }}</p>
                </div>
                <svg class="w-12 h-12 text-purple-500 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Sesiones</p>
                  <p class="text-3xl font-bold text-orange-600 mt-1">{{ estado.estadisticas.sesionesActivas }}</p>
                </div>
                <svg class="w-12 h-12 text-orange-500 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Estado de Nodos -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Estado de Nodos</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="nodo in estado.nodos"
                :key="nodo.id"
                :class="['p-4 rounded-lg border-2', getNodoClass(nodo.estado)]"
              >
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-bold text-gray-800">{{ nodo.nombre }}</h3>
                  <span :class="['px-2 py-1 rounded text-xs font-semibold', getNodoEstadoClass(nodo.estado)]">
                    {{ nodo.estado }}
                  </span>
                </div>
                <div class="space-y-1 text-sm text-gray-700">
                  <p>Carga: {{ nodo.cargaPorcentaje }}%</p>
                  <p>Archivos: {{ nodo.archivos }}</p>
                  <p>Latencia: {{ nodo.latencia }}ms</p>
                  <p>Fallos: {{ nodo.fallos }}</p>
                </div>
                <div class="mt-3 flex gap-2">
                  <button
                    v-if="nodo.estado === 'ACTIVO' && sesion?.usuario.rol === 'admin'"
                    @click="simularFallo(nodo.id)"
                    class="flex-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-semibold"
                  >
                    Simular Fallo
                  </button>
                  <button
                    v-if="nodo.estado === 'INACTIVO' && sesion?.usuario.rol === 'admin'"
                    @click="recuperarNodo(nodo.id)"
                    class="flex-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm font-semibold"
                  >
                    Recuperar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Inconsistencias -->
          <div v-if="estado.inconsistencias.length > 0" class="bg-red-50 border-2 border-red-300 rounded-xl p-6">
            <h2 class="text-xl font-bold text-red-800 mb-4">Inconsistencias Detectadas</h2>
            <div v-for="(inc, idx) in estado.inconsistencias" :key="idx" class="bg-white p-3 rounded-lg mb-2">
              <p class="font-semibold text-red-700">{{ inc.tipo }}</p>
              <p class="text-sm text-gray-600">{{ inc.detalles }}</p>
            </div>
          </div>
        </div>

        <!-- Vista Nodos -->
        <div v-if="vista === 'nodos' && estado" class="space-y-6">
          <div v-if="sesion?.usuario.rol === 'admin'" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Agregar Nuevo Nodo</h2>
            <form @submit.prevent="agregarNodo" class="flex gap-4">
              <input
                v-model="nodoForm.nombre"
                type="text"
                placeholder="Nombre del nodo"
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                v-model.number="nodoForm.capacidad"
                type="number"
                placeholder="Capacidad"
                class="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                :disabled="loading"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                Agregar
              </button>
            </form>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="nodo in estado.nodos" :key="nodo.id" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-800">{{ nodo.nombre }}</h3>
                <span :class="['px-3 py-1 rounded-full text-sm font-semibold', getNodoEstadoClass(nodo.estado)]">
                  {{ nodo.estado }}
                </span>
              </div>

              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Carga</span>
                    <span class="font-semibold">{{ nodo.cargaPorcentaje }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      :class="['h-2 rounded-full transition-all', getCargaClass(nodo.cargaPorcentaje)]"
                      :style="{ width: nodo.cargaPorcentaje + '%' }"
                    ></div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-600">Capacidad</p>
                    <p class="font-semibold">{{ nodo.capacidad }}</p>
                  </div>
                  <div>
                    <p class="text-gray-600">Archivos</p>
                    <p class="font-semibold">{{ nodo.archivos }}</p>
                  </div>
                  <div>
                    <p class="text-gray-600">Latencia</p>
                    <p class="font-semibold">{{ nodo.latencia }}ms</p>
                  </div>
                  <div>
                    <p class="text-gray-600">Fallos</p>
                    <p class="font-semibold text-red-600">{{ nodo.fallos }}</p>
                  </div>
                </div>

                <div class="pt-3 border-t border-gray-200">
                  <p class="text-xs text-gray-500">
                    Último heartbeat: {{ formatDate(nodo.ultimoHeartbeat) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Vista Archivos -->
        <div v-if="vista === 'archivos' && estado" class="space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Crear Nuevo Archivo</h2>
            <form @submit.prevent="crearArchivo" class="space-y-4">
              <input
                v-model="archivoForm.nombre"
                type="text"
                placeholder="Nombre del archivo"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <textarea
                v-model="archivoForm.contenido"
                placeholder="Contenido del archivo"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                required
              ></textarea>
              <button
                type="submit"
                :disabled="loading"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                Crear Archivo
              </button>
            </form>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Archivos en el Sistema</h2>
            <div class="space-y-4">
              <div
                v-for="archivo in estado.archivos"
                :key="archivo.id"
                class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h3 class="font-bold text-gray-800">📄 {{ archivo.nombre }}</h3>
                    <p class="text-sm text-gray-600 mt-1">
                      Propietario: {{ getNombreUsuario(archivo.propietarioId) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="archivo.bloqueado" class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                      🔒 Bloqueado
                    </span>
                    <span v-else class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                      🔓 Disponible
                    </span>
                  </div>
                </div>

                <div class="bg-gray-50 p-3 rounded-lg mb-3">
                  <p class="text-sm text-gray-700 font-mono">{{ archivo.contenido }}</p>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p class="text-gray-600">Versión</p>
                    <p class="font-semibold">v{{ archivo.version }}</p>
                  </div>
                  <div>
                    <p class="text-gray-600">Nodo Principal</p>
                    <p class="font-semibold">{{ archivo.nodoId }}</p>
                  </div>
                  <div>
                    <p class="text-gray-600">Réplicas</p>
                    <p class="font-semibold">{{ archivo.replicas.length }}</p>
                  </div>
                  <div>
                    <p class="text-gray-600">Checksum</p>
                    <p class="font-semibold text-xs">{{ archivo.checksum.substring(0, 8) }}...</p>
                  </div>
                </div>

                <div v-if="archivo.replicas.length > 0" class="mb-3">
                  <p class="text-sm text-gray-600 mb-1">Réplicas en:</p>
                  <div class="flex gap-2 flex-wrap">
                    <span
                      v-for="replicaId in archivo.replicas"
                      :key="replicaId"
                      class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold"
                    >
                      {{ replicaId }}
                    </span>
                  </div>
                </div>

                <button
                  v-if="archivo.propietarioId === sesion?.usuario.id || sesion?.usuario.rol === 'admin'"
                  @click="modificarArchivoPrompt(archivo)"
                  :disabled="archivo.bloqueado && archivo.bloqueadoPor !== sesion?.usuario.id"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Modificar
                </button>

                <div class="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  <p>Creado: {{ formatDate(archivo.fechaCreacion) }}</p>
                  <p>Modificado: {{ formatDate(archivo.fechaModificacion) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Vista Auditoría -->
        <div v-if="vista === 'auditoria' && estado" class="space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Registro de Auditoría</h2>
            
            <div class="space-y-2">
              <div
                v-for="log in estado.logs.slice().reverse()"
                :key="log.id"
                :class="['p-4 rounded-lg border-l-4', getLogClass(log.resultado)]"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <span :class="['px-2 py-1 rounded text-xs font-bold', getLogBadgeClass(log.resultado)]">
                        {{ log.evento }}
                      </span>
                      <span class="text-sm text-gray-600">
                        {{ formatDate(log.timestamp) }}
                      </span>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span class="text-gray-600">Usuario:</span>
                        <span class="font-semibold ml-1">{{ log.usuarioId }}</span>
                      </div>
                      <div>
                        <span class="text-gray-600">Recurso:</span>
                        <span class="font-semibold ml-1">{{ log.recurso }}</span>
                      </div>
                      <div>
                        <span class="text-gray-600">Nodo:</span>
                        <span class="font-semibold ml-1">{{ log.nodoId }}</span>
                      </div>
                      <div>
                        <span class="text-gray-600">Resultado:</span>
                        <span class="font-semibold ml-1">{{ log.resultado }}</span>
                      </div>
                    </div>

                    <div v-if="Object.keys(log.detalles).length > 0" class="mt-2 p-2 bg-white rounded text-xs">
                      <p class="font-semibold text-gray-700 mb-1">Detalles:</p>
                      <pre class="text-gray-600 overflow-x-auto">{{ JSON.stringify(log.detalles, null, 2) }}</pre>
                    </div>

                    <div class="mt-2 text-xs text-gray-500">
                      <span>Checksum: {{ log.checksum.substring(0, 16) }}...</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="estado.logs.length === 0" class="text-center py-8 text-gray-500">
                No hay registros de auditoría disponibles
              </div>
            </div>
          </div>

          <!-- Resumen de Eventos -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-gray-800 mb-3">Eventos Exitosos</h3>
              <p class="text-4xl font-bold text-green-600">
                {{ estado.logs.filter(l => l.resultado === 'EXITOSO').length }}
              </p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-gray-800 mb-3">Eventos Fallidos</h3>
              <p class="text-4xl font-bold text-red-600">
                {{ estado.logs.filter(l => l.resultado === 'FALLIDO').length }}
              </p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-gray-800 mb-3">Fallos de Sistema</h3>
              <p class="text-4xl font-bold text-orange-600">
                {{ estado.logs.filter(l => l.resultado === 'FALLO').length }}
              </p>
            </div>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="bg-white border-t border-gray-200 mt-8">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between text-sm text-gray-600">
            <p>Sistema Distribuido de Gestión v1.0</p>
            <p>Email: {{ sesion?.usuario.email }}</p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const API_URL = 'http://localhost:3000/api';

const estado = ref(null);
const sesion = ref(null);
const vista = ref('login');
const loading = ref(false);
const mensaje = ref(null);

const loginForm = ref({ usuario: '', password: '' });
const archivoForm = ref({ nombre: '', contenido: '' });
const nodoForm = ref({ nombre: '', capacidad: 100 });

let intervalId = null;

const mostrarMensaje = (texto, tipo = 'info') => {
  mensaje.value = { texto, tipo };
  setTimeout(() => {
    mensaje.value = null;
  }, 5000);
};

const cargarEstado = async () => {
  try {
    const res = await fetch(`${API_URL}/estado`);
    const data = await res.json();
    if (data.success) {
      estado.value = data.data;
    }
  } catch (error) {
    console.error('Error al cargar estado:', error);
  }
};

const login = async () => {
  loading.value = true;
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    });
    const data = await res.json();
    
    if (data.success) {
      sesion.value = data.data;
      vista.value = 'dashboard';
      mostrarMensaje('Inicio de sesión exitoso', 'success');
      await cargarEstado();
      iniciarActualizacionAutomatica();
    } else {
      mostrarMensaje(data.error, 'error');
    }
  } catch (error) {
    mostrarMensaje('Error de conexión', 'error');
  }
  loading.value = false;
};

const logout = async () => {
  try {
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sesion.value.token })
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
  sesion.value = null;
  vista.value = 'login';
  estado.value = null;
  detenerActualizacionAutomatica();
};

const crearArchivo = async () => {
  loading.value = true;
  try {
    const res = await fetch(`${API_URL}/archivo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...archivoForm.value,
        usuarioId: sesion.value.usuario.id,
        token: sesion.value.token
      })
    });
    const data = await res.json();
    
    if (data.success) {
      mostrarMensaje('Archivo creado exitosamente', 'success');
      archivoForm.value = { nombre: '', contenido: '' };
      await cargarEstado();
    } else {
      mostrarMensaje(data.error, 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al crear archivo', 'error');
  }
  loading.value = false;
};

const modificarArchivoPrompt = async (archivo) => {
  const nuevoContenido = prompt('Nuevo contenido:', archivo.contenido);
  if (nuevoContenido !== null) {
    await modificarArchivo(archivo.id, nuevoContenido);
  }
};

const modificarArchivo = async (archivoId, nuevoContenido) => {
  loading.value = true;
  try {
    const res = await fetch(`${API_URL}/archivo/${archivoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contenido: nuevoContenido,
        usuarioId: sesion.value.usuario.id,
        token: sesion.value.token
      })
    });
    const data = await res.json();
    
    if (data.success) {
      mostrarMensaje('Archivo modificado exitosamente', 'success');
      await cargarEstado();
    } else {
      mostrarMensaje(data.error, 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al modificar archivo', 'error');
  }
  loading.value = false;
};

const simularFallo = async (nodoId) => {
  loading.value = true;
  try {
    const res = await fetch(`${API_URL}/nodo/fallo/${nodoId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    
    if (data.success) {
      mostrarMensaje(`Nodo ${nodoId} caído - Sistema recuperando archivos...`, 'warning');
      await cargarEstado();
    } else {
      mostrarMensaje(data.error, 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al simular fallo', 'error');
  }
  loading.value = false;
};

const recuperarNodo = async (nodoId) => {
  loading.value = true;
  try {
    const res = await fetch(`${API_URL}/nodo/recuperar/${nodoId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    
    if (data.success) {
      mostrarMensaje(`Nodo ${nodoId} recuperado exitosamente`, 'success');
      await cargarEstado();
    } else {
      mostrarMensaje(data.error, 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al recuperar nodo', 'error');
  }
  loading.value = false;
};

const agregarNodo = async () => {
  loading.value = true;
  try {
    const res = await fetch(`${API_URL}/nodo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodoForm.value)
    });
    const data = await res.json();
    
    if (data.success) {
      mostrarMensaje('Nodo agregado exitosamente', 'success');
      nodoForm.value = { nombre: '', capacidad: 100 };
      await cargarEstado();
    } else {
      mostrarMensaje(data.error, 'error');
    }
  } catch (error) {
    mostrarMensaje('Error al agregar nodo', 'error');
  }
  loading.value = false;
};

const iniciarActualizacionAutomatica = () => {
  intervalId = setInterval(cargarEstado, 3000);
};

const detenerActualizacionAutomatica = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleString();
};

const getNombreUsuario = (usuarioId) => {
  const usuario = estado.value?.usuarios.find(u => u.id === usuarioId);
  return usuario ? `${usuario.nombre} ${usuario.apellido}` : usuarioId;
};

const getMensajeClass = () => {
  if (!mensaje.value) return '';
  const tipos = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  return tipos[mensaje.value.tipo] || tipos.info;
};

const getNodoClass = (estado) => {
  const clases = {
    ACTIVO: 'bg-green-50 border-green-300',
    DEGRADADO: 'bg-yellow-50 border-yellow-300',
    INACTIVO: 'bg-red-50 border-red-300'
  };
  return clases[estado] || clases.INACTIVO;
};

const getNodoEstadoClass = (estado) => {
  const clases = {
    ACTIVO: 'bg-green-200 text-green-800',
    DEGRADADO: 'bg-yellow-200 text-yellow-800',
    INACTIVO: 'bg-red-200 text-red-800'
  };
  return clases[estado] || clases.INACTIVO;
};

const getCargaClass = (carga) => {
  const cargaNum = parseFloat(carga);
  if (cargaNum > 80) return 'bg-red-500';
  if (cargaNum > 60) return 'bg-yellow-500';
  return 'bg-green-500';
};

const getLogClass = (resultado) => {
  const clases = {
    EXITOSO: 'bg-green-50 border-green-500',
    FALLIDO: 'bg-red-50 border-red-500',
    FALLO: 'bg-orange-50 border-orange-500'
  };
  return clases[resultado] || 'bg-blue-50 border-blue-500';
};

const getLogBadgeClass = (resultado) => {
  const clases = {
    EXITOSO: 'bg-green-200 text-green-800',
    FALLIDO: 'bg-red-200 text-red-800',
    FALLO: 'bg-orange-200 text-orange-800'
  };
  return clases[resultado] || 'bg-blue-200 text-blue-800';
};

onMounted(() => {
  if (sesion.value) {
    cargarEstado();
    iniciarActualizacionAutomatica();
  }
});

onUnmounted(() => {
  detenerActualizacionAutomatica();
});
</script>
